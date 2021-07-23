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
  SolutionContext,
  AzureAccountProvider,
  SubscriptionInfo,
} from "@microsoft/teamsfx-api";
import { GLOBAL_CONFIG, SolutionError } from "./constants";
import { v4 as uuidv4 } from "uuid";
import { ResourceManagementClient } from "@azure/arm-resources";

export type AzureSubscription = {
  displayName: string;
  subscriptionId: string;
};

class CommonQuestions {
  resourceNameSuffix = "";
  resourceGroupName = "";
  tenantId = "";
  subscriptionId = "";
  // default to East US for now
  location = "East US";
  teamsAppTenantId = "";
}

/**
 * make sure subscription is correct
 *
 */
export async function checkSubscription(
  ctx: SolutionContext
): Promise<Result<SubscriptionInfo, FxError>> {
  if (ctx.azureAccountProvider === undefined) {
    return err(
      returnSystemError(
        new Error("azureAccountProvider is undefined"),
        "Solution",
        SolutionError.InternelError
      )
    );
  }
  const activeSubscriptionId = ctx.config.get(GLOBAL_CONFIG)?.get("subscriptionId");
  const askSubRes = await ctx.azureAccountProvider!.getSelectedSubscription(true);
  return ok(askSubRes!);
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
  const subscriptionResult = await checkSubscription(ctx);
  if (subscriptionResult.isErr()) {
    return err(subscriptionResult.error);
  }
  const subscriptionId = subscriptionResult.value.subscriptionId;
  commonQuestions.subscriptionId = subscriptionId;
  commonQuestions.tenantId = subscriptionResult.value.tenantId;
  ctx.logProvider?.info(`[Solution] askCommonQuestions, step 1 - check subscriptionId pass!`);

  // Note setSubscription here will change the token returned by getAccountCredentialAsync according to the subscription selected.
  // So getting azureToken needs to precede setSubscription.
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
