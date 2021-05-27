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
  SolutionContext,
  AzureAccountProvider,
  SubscriptionInfo,
  UserInteraction,
} from "@microsoft/teamsfx-api";
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
  first: Promise<PartialList<T>>
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
  const filteredSubs = subs.filter(
    (sub) => sub.displayName !== undefined && sub.subscriptionId !== undefined
  );
  return filteredSubs.map((sub) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { displayName: sub.displayName!, subscriptionId: sub.subscriptionId! };
  });
}

// Parse tenantId from azure token. Azure token is just a base64-encoded JSON object.
async function parseAzureTenantId(
  azureToken: TokenCredentialsBase
): Promise<Result<string, SystemError>> {
  const token = (await azureToken.getToken()).accessToken;
  const array = token.split(".");
  if (array.length < 2) {
    return err(
      returnSystemError(
        new Error("Invalid access token"),
        "Solution",
        SolutionError.FailedToParseAzureTenantId
      )
    );
  }
  const buff = Buffer.from(array[1], "base64");
  const obj = JSON.parse(buff.toString("utf-8"));
  const tenantId = (obj as any)["tid"];
  if (tenantId === undefined || typeof tenantId !== "string") {
    return err(
      returnSystemError(
        new Error("Tenant id not found"),
        "Solution",
        SolutionError.FailedToParseAzureTenantId
      )
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

/**
 * Ask user to select a subscription. subscriptionId, tenantId
 *
 */
export async function askSubscription(
  config: SolutionConfig,
  azureAccountProvider?: AzureAccountProvider,
  ui?:UserInteraction
): Promise<Result<{ subscriptionId: string; tenantId: string }, FxError>> {
  if (azureAccountProvider === undefined) {
    return err(
      returnSystemError(
        new Error("azureAccountProvider is undefined"),
        "Solution",
        SolutionError.InternelError
      )
    );
  }
  const subscriptions: SubscriptionInfo[] = await azureAccountProvider.listSubscriptions();
  if (subscriptions.length === 0) {
    return err(
      returnUserError(
        new Error("Failed to find a subscription."),
        "Solution",
        SolutionError.NoSubscriptionFound
      )
    );
  }
  const activeSubscriptionId = config.get(GLOBAL_CONFIG)?.getString("subscriptionId");
  const activeTenantId = config.get(GLOBAL_CONFIG)?.getString("tenantId");
  if (
    activeSubscriptionId === undefined ||
    activeTenantId == undefined ||
    subscriptions.findIndex((sub) => sub.subscriptionId === activeSubscriptionId) < 0
  ) {
    const subscriptionNames: string[] = subscriptions.map(
      (subscription) => subscription.subscriptionName
    );
    const askRes = await ui!.selectOption({
      name: "askSub",
      title: "Select a subscription",
      options: subscriptionNames
    }); 
    if(askRes.isErr()) 
      throw askRes.error;
    // if (subscriptionName === undefined) {
    //   return err(
    //     returnUserError(
    //       new Error("No subscription selected"),
    //       "Solution",
    //       SolutionError.NoSubscriptionSelected
    //     )
    //   );
    // }
    const subscriptionName = askRes.value.result;
    const subscription = subscriptions.find(
      (subscription) => subscription.subscriptionName === subscriptionName
    );
    if (subscription === undefined) {
      return err(
        returnSystemError(
          new Error("Subscription not found"),
          "Solution",
          SolutionError.InternelError
        )
      );
    }
    return ok({ subscriptionId: subscription.subscriptionId, tenantId: subscription.tenantId });
  } else {
    return ok({ subscriptionId: activeSubscriptionId, tenantId: activeTenantId });
  }
}

/**
 * Asks common questions and puts the answers in the global namespace of SolutionConfig
 *
 */
async function askCommonQuestions(
  ctx: SolutionContext,
  appName: string,
  config: SolutionConfig,
  azureAccountProvider?: AzureAccountProvider,
  appstudioTokenJson?: object
): Promise<Result<CommonQuestions, FxError>> {
  if (appstudioTokenJson === undefined) {
    return err(
      returnSystemError(
        new Error("Graph token json is undefined"),
        "Solution",
        SolutionError.NoAppStudioToken
      )
    );
  }

  const commonQuestions = new CommonQuestions();

  //1. check subscriptionId
  const subscriptionResult = await askSubscription(config, azureAccountProvider, ctx.ui);
  if (subscriptionResult.isErr()) {
    return err(subscriptionResult.error);
  }
  const subscriptionId = subscriptionResult.value.subscriptionId;
  commonQuestions.subscriptionId = subscriptionId;
  commonQuestions.tenantId = subscriptionResult.value.tenantId;
  ctx.logProvider?.info(`[Solution] askCommonQuestions, step 1 - check subscriptionId pass!`);

  // Note setSubscription here will change the token returned by getAccountCredentialAsync according to the subscription selected.
  // So getting azureToken needs to precede setSubscription.
  await azureAccountProvider?.setSubscription(subscriptionId);
  const azureToken = await azureAccountProvider?.getAccountCredentialAsync();
  if (azureToken === undefined) {
    return err(
      returnUserError(
        new Error("Login to Azure using the Azure Account extension"),
        "Solution",
        SolutionError.NotLoginToAzure
      )
    );
  }

  //2. check resource group
  const rmClient = new ResourceManagementClient(azureToken, subscriptionId);
  let resourceGroupName = config.get(GLOBAL_CONFIG)?.getString("resourceGroupName");
  let needCreateResourceGroup = false;
  if (resourceGroupName) {
    const checkRes = await rmClient.resourceGroups.checkExistence(resourceGroupName);
    if (!checkRes.body) {
      needCreateResourceGroup = true;
    }
  } else {
    resourceGroupName = `${appName.replace(" ", "_")}-rg`;
    needCreateResourceGroup = true;
  }
  if (needCreateResourceGroup) {
    const response = await rmClient.resourceGroups.createOrUpdate(resourceGroupName, {
      location: commonQuestions.location,
    });
    if (response.name === undefined) {
      return err(
        returnSystemError(
          new Error(`Failed to create resource group ${resourceGroupName}`),
          "Solution",
          SolutionError.FailedToCreateResourceGroup
        )
      );
    }
    resourceGroupName = response.name;
    ctx.logProvider?.info(
      `[Solution] askCommonQuestions - resource group:'${resourceGroupName}' created!`
    );
  }
  commonQuestions.resourceGroupName = resourceGroupName;
  ctx.logProvider?.info(`[Solution] askCommonQuestions, step 2 - check resource group pass!`);

  // teamsAppTenantId
  const teamsAppTenantId = (appstudioTokenJson as any).tid;
  if (
    teamsAppTenantId === undefined ||
    !(typeof teamsAppTenantId === "string") ||
    teamsAppTenantId.length === 0
  ) {
    return err(
      returnSystemError(
        new Error("Cannot find Teams app tenant id"),
        "Solution",
        SolutionError.NoTeamsAppTenantId
      )
    );
  } else {
    commonQuestions.teamsAppTenantId = teamsAppTenantId;
  }
  ctx.logProvider?.info(`[Solution] askCommonQuestions, step 3 - check teamsAppTenantId pass!`);

  //resourceNameSuffix
  const resourceNameSuffix = config.get(GLOBAL_CONFIG)?.getString("resourceNameSuffix");
  if (!resourceNameSuffix) commonQuestions.resourceNameSuffix = uuidv4().substr(0, 6);
  else commonQuestions.resourceNameSuffix = resourceNameSuffix;
  ctx.logProvider?.info(`[Solution] askCommonQuestions, step 4 - check resourceNameSuffix pass!`);

  ctx.logProvider?.info(`[Solution] askCommonQuestions, step 5 - check tenantId pass!`);

  return ok(commonQuestions);
}

/**
 * Asks for userinput and fills the answers in global config.
 *
 * @param config reference to solution config
 * @param dialog communication channel to Core Module
 */
export async function fillInCommonQuestions(
  ctx: SolutionContext,
  appName: string,
  config: SolutionConfig,
  dialog?: Dialog,
  azureAccountProvider?: AzureAccountProvider,
  // eslint-disable-next-line @typescript-eslint/ban-types
  appStudioJson?: object
): Promise<Result<SolutionConfig, FxError>> {
  const result = await askCommonQuestions(
    ctx,
    appName,
    config,
    azureAccountProvider,
    appStudioJson
  );
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
