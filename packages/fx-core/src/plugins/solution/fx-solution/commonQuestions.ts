/* eslint-disable @typescript-eslint/ban-types */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
    DialogMsg,
    DialogType,
    QuestionType,
    ok,
    err,
    returnSystemError,
    returnUserError,
    Dialog,
    FxError,
    Result,
    SolutionConfig,
    SystemError,
} from "fx-api";
import { GLOBAL_CONFIG, SolutionError } from "./constants";
import { v4 as uuidv4 } from "uuid";
import { ResourceManagementClient } from "@azure/arm-resources";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

interface PartialList<T> extends Array<T> {
    nextLink?: string;
}

// Copied from https://github.com/microsoft/vscode-azure-account/blob/2b3c1a8e81e237580465cc9a1f4da5caa34644a6/sample/src/extension.ts
// to list all subscriptions
async function listAll<T>(
    client: { listNext(nextPageLink: string): Promise<PartialList<T>> },
    first: Promise<PartialList<T>>,
): Promise<T[]> {
    const all: T[] = [];
    for (
        let list = await first;
        list.length || list.nextLink;
        list = list.nextLink ? await client.listNext(list.nextLink) : []
    ) {
        all.push(...list);
    }
    return all;
}

export type AzureSubscription = {
    displayName: string;
    subscriptionId: string;
};

async function getSubscriptionList(azureToken: TokenCredentialsBase): Promise<AzureSubscription[]> {
    const client = new SubscriptionClient(azureToken);
    const subscriptions = await listAll(client.subscriptions, client.subscriptions.list());
    const subs: Partial<AzureSubscription>[] = subscriptions.map((sub) => {
        return { displayName: sub.displayName, subscriptionId: sub.subscriptionId };
    });
    const filteredSubs = subs.filter((sub) => sub.displayName !== undefined && sub.subscriptionId !== undefined);
    return filteredSubs.map((sub) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return { displayName: sub.displayName!, subscriptionId: sub.subscriptionId! };
    });
}

// Parse tenantId from azure token. Azure token is just a base64-encoded JSON object.
async function parseAzureTenantId(azureToken: TokenCredentialsBase): Promise<Result<string, SystemError>> {
    const token = (await azureToken.getToken()).accessToken;
    const array = token.split(".");
    if (array.length < 2) {
        return err(
            returnSystemError(new Error("Invalid accessToken"), "Solution", SolutionError.FailedToParseAzureTenantId),
        );
    }
    const buff = Buffer.from(array[1], "base64");
    const obj = JSON.parse(buff.toString("utf-8"));
    const tenantId = (obj as any)["tid"];
    if (tenantId === undefined || typeof tenantId !== "string") {
        return err(
            returnSystemError(new Error("TenantId not found"), "Solution", SolutionError.FailedToParseAzureTenantId),
        );
    }
    return ok(tenantId);
}

class CommonQuestions {
    resourceNameSuffix = "";
    resourceGroupName = "";
    tenantId = "";
    subscriptionId = "";
    // default to East US for now
    location = "East US";
    teamsAppTenantId = "";
}

function getExistingAnswers(config: SolutionConfig): CommonQuestions | undefined {
    const commonQuestions = new CommonQuestions();
    for (const k of Object.keys(commonQuestions)) {
        const value = config.get(GLOBAL_CONFIG)?.getString(k);
        if (value === undefined || typeof value !== "string") {
            return undefined;
        }
        (commonQuestions as any)[k] = value;
    }
    return commonQuestions;
}

export async function askSubscription(config: SolutionConfig, azureToken: TokenCredentialsBase, dialog?: Dialog,) : Promise<Result<string, FxError>>{
    const subscriptions: AzureSubscription[] = await getSubscriptionList(azureToken);
    if (subscriptions.length === 0) {
        return err(
            returnUserError(
                new Error("No Subscription was found."),
                "Solution",
                SolutionError.NoSubscriptionFound
               // "https://github.com/OfficeDev/MODS-toolkit-extension/wiki/Error:-No-Subscription-Found",
            ),
        );
    }
    const activeSubscriptionId = config.get(GLOBAL_CONFIG)?.getString("subscriptionId");
    if (
        activeSubscriptionId === undefined ||
        subscriptions.findIndex((sub) => sub.subscriptionId === activeSubscriptionId) < 0
    ) {
        const subscriptionNames: string[] = subscriptions.map((subscription) => subscription.displayName);
        const subscriptionName = (
            await dialog?.communicate(
                new DialogMsg(DialogType.Ask, {
                    type: QuestionType.Radio,
                    description: "Please select a subscription",
                    options: subscriptionNames,
                }),
            )
        )?.getAnswer();
        if (subscriptionName === undefined) {
            return err(
                returnUserError(
                    new Error("No subscription selected"),
                    "Solution",
                    SolutionError.NoSubscriptionSelected,
                ),
            );
        }
        const subscription = subscriptions.find((subscription) => subscription.displayName === subscriptionName);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return ok(subscription!.subscriptionId!);
    } else {
        return ok(activeSubscriptionId);
    }
}

/**
 * Asks common questions and puts the answers in the global namespace of SolutionConfig
 *
 * @todo(yefu): maybe let teams app developers to choose subscriptionId
 *
 * @param solutionConfig
 */
async function askCommonQuestions(
    appName: string,
    config: SolutionConfig,
    dialog?: Dialog,
    azureToken?: TokenCredentialsBase,
    appstudioTokenJson?: object,
): Promise<Result<CommonQuestions, FxError>> {
    if (appstudioTokenJson === undefined) {
        return err(
            returnSystemError(new Error("Graph token json is undefined"), "Solution", SolutionError.NoAppStudioToken),
        );
    }
    if (azureToken === undefined) {
        return err(
            returnUserError(
                new Error("Please login to azure using Azure Account Extension"),
                "Solution",
                SolutionError.NotLoginToAzure,
            ),
        );
    }

    const exisitingAnswers = getExistingAnswers(config);
    if (exisitingAnswers) {
        // early return if all answers are already there.
        return ok(exisitingAnswers);
    }

    const commonQuestions = new CommonQuestions();

    const teamsAppTenantId = (appstudioTokenJson as any).tid;
    if (teamsAppTenantId === undefined || !(typeof teamsAppTenantId === "string") || teamsAppTenantId.length === 0) {
        return err(
            returnSystemError(
                new Error("Cannot find teams app tenant id"),
                "Solution",
                SolutionError.NoTeamsAppTenantId,
            ),
        );
    } else {
        commonQuestions.teamsAppTenantId = teamsAppTenantId;
    }

    commonQuestions.resourceNameSuffix = uuidv4().substr(0, 6);

    const subscriptionResult = await askSubscription(config, azureToken, dialog);
    if (subscriptionResult.isErr()){
        return err(subscriptionResult.error);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    commonQuestions.subscriptionId = subscriptionResult.value!;

    const parseTenantIdResult = await parseAzureTenantId(azureToken);
    if (parseTenantIdResult.isErr()) {
        return err(parseTenantIdResult.error);
    }

    commonQuestions.tenantId = parseTenantIdResult.value;

    const resourceGroupName = `${appName}-rg`;
    const client = new ResourceManagementClient(azureToken, commonQuestions.subscriptionId);
    const response = await client.resourceGroups.createOrUpdate(resourceGroupName, {
        location: commonQuestions.location,
    });
    if (response.name === undefined) {
        return err(
            returnSystemError(
                new Error(`Failed to create resource group ${resourceGroupName}`),
                "Solution",
                SolutionError.FailedToCreateResourceGroup,
            ),
        );
    }
    commonQuestions.resourceGroupName = response.name;

    return ok(commonQuestions);
}

/**
 * Asks for userinput and fills the answers in global config.
 *
 * @param config reference to solution config
 * @param dialog communication channel to Core Module
 */
export async function fillInCommonQuestions(
    appName: string,
    config: SolutionConfig,
    dialog?: Dialog,
    azureToken?: TokenCredentialsBase,
    // eslint-disable-next-line @typescript-eslint/ban-types
    appStudioJson?: object,
): Promise<Result<SolutionConfig, FxError>> {
    const result = await askCommonQuestions(appName, config, dialog, azureToken, appStudioJson);
    if (result.isOk()) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const globalConfig = config.get(GLOBAL_CONFIG)!;
        result.map((commonQuestions) => {
            for (const [k, v] of Object.entries(commonQuestions)) {
                globalConfig.set(k, v);
            }
        });
        return ok(config);
    }
    return result.map((_) => config);
}
