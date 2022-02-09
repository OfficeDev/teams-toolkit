// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ResourceManagementClient } from "@azure/arm-resources";
import {
  AppStudioTokenProvider,
  AzureAccountProvider,
  AzureSolutionSettings,
  EnvConfigFileNameTemplate,
  EnvNamePlaceholder,
  err,
  FxError,
  ok,
  QTreeNode,
  Result,
  SystemError,
  TokenProvider,
  UserError,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { isUndefined } from "lodash";
import { Container } from "typedi";
import * as util from "util";
import { v4 as uuidv4 } from "uuid";
import { PluginDisplayName } from "../../../../common/constants";
import {
  CustomizeResourceGroupType,
  TelemetryEvent,
  TelemetryProperty,
} from "../../../../common/telemetry";
import { getHashedEnv, getResourceGroupInPortal, getStrings } from "../../../../common/tools";
import { AppStudioPluginV3 } from "../../../resource/appstudio/v3";
import arm from "../arm";
import { ResourceGroupInfo } from "../commonQuestions";
import { SolutionError, SolutionSource } from "../constants";
import { configLocalDebugSettings, setupLocalDebugSettings } from "../debug/provisionLocal";
import { resourceGroupHelper } from "../utils/ResourceGroupHelper";
import { executeConcurrently } from "../v2/executor";
import { BuiltInFeaturePluginNames } from "./constants";
import { solutionGlobalVars } from "./solutionGlobalVars";

export async function getQuestionsForProvision(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
  tokenProvider: TokenProvider
): Promise<Result<QTreeNode | undefined, FxError>> {
  const solutionSetting = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
  const root = new QTreeNode({ type: "group" });
  for (const pluginName of solutionSetting.activeResourcePlugins) {
    const plugin = Container.get<v3.FeaturePlugin>(pluginName);
    if (plugin.getQuestionsForProvision) {
      const res = await plugin.getQuestionsForProvision(ctx, inputs, envInfo, tokenProvider);
      if (res.isErr()) {
        return res;
      }
      if (res.value) {
        const node = res.value;
        if (node && node.data) {
          root.addChild(node);
        }
      }
    }
  }
  return ok(root);
}
export async function provisionResources(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  tokenProvider: TokenProvider
): Promise<Result<v3.EnvInfoV3, FxError>> {
  const solutionSetting = ctx.projectSetting.solutionSettings as AzureSolutionSettings | undefined;
  // check M365 tenant match
  if (!envInfo.state[BuiltInFeaturePluginNames.appStudio])
    envInfo.state[BuiltInFeaturePluginNames.appStudio] = {};
  const teamsAppResource = envInfo.state[
    BuiltInFeaturePluginNames.appStudio
  ] as v3.TeamsAppResource;
  if (!envInfo.state.solution) envInfo.state.solution = {};
  const solutionConfig = envInfo.state.solution as v3.AzureSolutionConfig;
  const tenantIdInConfig = teamsAppResource.tenantId;
  const tenantIdInTokenRes = await getM365TenantId(tokenProvider.appStudioToken);
  if (tenantIdInTokenRes.isErr()) {
    return err(tenantIdInTokenRes.error);
  }
  const tenantIdInToken = tenantIdInTokenRes.value;
  if (tenantIdInConfig && tenantIdInToken && tenantIdInToken !== tenantIdInConfig) {
    return err(
      new UserError(
        SolutionError.TeamsAppTenantIdNotRight,
        `The signed in M365 account does not match the M365 tenant in config file for '${envInfo.envName}' environment. Please sign out and sign in with the correct M365 account.`,
        "Solution"
      )
    );
  }
  if (!tenantIdInConfig) {
    teamsAppResource.tenantId = tenantIdInToken;
    solutionConfig.teamsAppTenantId = tenantIdInToken;
  }

  // register teams app
  const appStudioV3 = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
  const registerTeamsAppRes = await appStudioV3.registerTeamsApp(ctx, inputs, envInfo);
  if (registerTeamsAppRes.isErr()) return err(registerTeamsAppRes.error);
  const teamsAppId = registerTeamsAppRes.value;
  solutionGlobalVars.TeamsAppId = teamsAppId;

  if (solutionSetting) {
    if (envInfo.envName === "local") {
      // TODO for local debug
      const debugProvisionResult = await setupLocalDebugSettings(ctx, inputs, envInfo);
      if (debugProvisionResult.isErr()) {
        return err(debugProvisionResult.error);
      }
    } else {
      // ask common question and fill in solution config
      const solutionConfigRes = await fillInAzureConfigs(
        ctx,
        inputs,
        envInfo as v3.EnvInfoV3,
        tokenProvider
      );
      if (solutionConfigRes.isErr()) {
        return err(solutionConfigRes.error);
      }
      // ask for provision consent
      const consentResult = await askForProvisionConsent(
        ctx,
        tokenProvider.azureAccountProvider,
        envInfo as v3.EnvInfoV3
      );
      if (consentResult.isErr()) {
        return err(consentResult.error);
      }

      // create resource group if needed
      if (solutionConfig.needCreateResourceGroup) {
        const createRgRes = await resourceGroupHelper.createNewResourceGroup(
          solutionConfig.resourceGroupName,
          tokenProvider.azureAccountProvider,
          solutionConfig.subscriptionId,
          solutionConfig.location
        );
        if (createRgRes.isErr()) {
          return err(createRgRes.error);
        }
      }
    }

    // collect plugins and provisionResources
    const plugins = solutionSetting.activeResourcePlugins.map((p) =>
      Container.get<v3.FeaturePlugin>(p)
    );
    const provisionThunks = plugins
      .filter((plugin: v3.FeaturePlugin) => !isUndefined(plugin.provisionResource))
      .map((plugin: v3.FeaturePlugin) => {
        return {
          pluginName: `${plugin.name}`,
          taskName: "provisionResource",
          thunk: () => {
            if (!envInfo.state[plugin.name]) {
              envInfo.state[plugin.name] = {};
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return plugin.provisionResource!(ctx, inputs, envInfo, tokenProvider);
          },
        };
      });
    ctx.logProvider.info(
      util.format(getStrings().solution.ProvisionStartNotice, PluginDisplayName.Solution)
    );
    const provisionResult = await executeConcurrently(provisionThunks, ctx.logProvider);
    if (provisionResult.kind !== "success") {
      return err(provisionResult.error);
    }

    ctx.logProvider.info(
      util.format(getStrings().solution.ProvisionFinishNotice, PluginDisplayName.Solution)
    );

    ctx.logProvider.info(
      util.format(getStrings().solution.DeployArmTemplates.StartNotice, PluginDisplayName.Solution)
    );
    const armRes = await arm.deployArmTemplates(
      ctx,
      inputs,
      envInfo,
      tokenProvider.azureAccountProvider
    );
    if (armRes.isErr()) {
      return err(armRes.error);
    }
    ctx.logProvider.info(
      util.format(
        getStrings().solution.DeployArmTemplates.SuccessNotice,
        PluginDisplayName.Solution
      )
    );

    // collect plugins and call configureResource
    const configureResourceThunks = plugins
      .filter((plugin: v3.FeaturePlugin) => !isUndefined(plugin.configureResource))
      .map((plugin: v3.FeaturePlugin) => {
        if (!envInfo.state[plugin.name]) {
          envInfo.state[plugin.name] = {};
        }
        return {
          pluginName: `${plugin.name}`,
          taskName: "configureResource",
          thunk: () =>
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            plugin.configureResource!(ctx, inputs, envInfo, tokenProvider),
        };
      });
    const configureResourceResult = await executeConcurrently(
      configureResourceThunks,
      ctx.logProvider
    );
    ctx.logProvider.info(
      util.format(getStrings().solution.ConfigurationFinishNotice, PluginDisplayName.Solution)
    );
    const envStates = envInfo.state as v3.TeamsFxAzureResourceStates;
    if (configureResourceResult.kind !== "success") {
      const msg = util.format(
        getStrings().solution.ProvisionFailNotice,
        ctx.projectSetting.appName
      );
      ctx.logProvider.error(msg);
      envStates.solution.provisionSucceeded = false;
      return err(configureResourceResult.error);
    }

    if (envInfo.envName === "local") {
      // TODO config local debug settings
      const configLocalDebugSettingsRes = await configLocalDebugSettings(ctx, inputs, envInfo);
      if (configLocalDebugSettingsRes.isErr()) {
        return err(configLocalDebugSettingsRes.error);
      }
    } else {
      const url = getResourceGroupInPortal(
        envStates.solution.subscriptionId,
        envStates.solution.tenantId,
        envStates.solution.resourceGroupName
      );
      const msg = util.format(
        `Success: ${getStrings().solution.ProvisionSuccessNotice}`,
        ctx.projectSetting.appName
      );
      ctx.logProvider.info(msg);
      if (url) {
        const title = "View Provisioned Resources";
        ctx.userInteraction.showMessage("info", msg, false, title).then((result: any) => {
          const userSelected = result.isOk() ? result.value : undefined;
          if (userSelected === title) {
            ctx.userInteraction.openUrl(url);
          }
        });
      } else {
        ctx.userInteraction.showMessage("info", msg, false);
      }
    }
  }
  //update Teams App
  const updateTeamsAppRes = await appStudioV3.updateTeamsApp(ctx, inputs, envInfo);
  if (updateTeamsAppRes.isErr()) {
    return err(updateTeamsAppRes.error);
  }
  return ok(envInfo);
}

/**
 * make sure subscription is correct
 *
 */
export async function checkAzureSubscription(
  ctx: v2.Context,
  envInfo: v3.EnvInfoV3,
  azureAccountProvider: AzureAccountProvider
): Promise<Result<Void, FxError>> {
  const subscriptionIdInConfig =
    envInfo.config.azure?.subscriptionId || (envInfo.state.solution.subscriptionId as string);
  if (!subscriptionIdInConfig) {
    const subscriptionInAccount = await azureAccountProvider.getSelectedSubscription(true);
    if (subscriptionInAccount) {
      envInfo.state.solution.subscriptionId = subscriptionInAccount.subscriptionId;
      envInfo.state.solution.subscriptionName = subscriptionInAccount.subscriptionName;
      envInfo.state.solution.tenantId = subscriptionInAccount.tenantId;
      ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
      return ok(Void);
    } else {
      return err(
        new UserError(
          SolutionError.SubscriptionNotFound,
          "Failed to select subscription",
          SolutionSource
        )
      );
    }
  }
  // make sure the user is logged in
  await azureAccountProvider.getAccountCredentialAsync(true);
  // verify valid subscription (permission)
  const subscriptions = await azureAccountProvider.listSubscriptions();
  const targetSubInfo = subscriptions.find(
    (item) => item.subscriptionId === subscriptionIdInConfig
  );
  if (!targetSubInfo) {
    return err(
      new UserError(
        SolutionError.SubscriptionNotFound,
        `The subscription '${subscriptionIdInConfig}'(${
          envInfo.state.solution.subscriptionName
        }) for '${
          envInfo.envName
        }' environment is not found in the current account, please use the right Azure account or check the '${EnvConfigFileNameTemplate.replace(
          EnvNamePlaceholder,
          envInfo.envName
        )}' file.`,
        SolutionSource
      )
    );
  }
  envInfo.state.solution.subscriptionId = targetSubInfo.subscriptionId;
  envInfo.state.solution.subscriptionName = targetSubInfo.subscriptionName;
  envInfo.state.solution.tenantId = targetSubInfo.tenantId;
  ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
  return ok(Void);
}

/**
 * Asks common questions and puts the answers in the global namespace of SolutionConfig
 *
 */
export async function fillInAzureConfigs(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  tokenProvider: TokenProvider
): Promise<Result<Void, FxError>> {
  //1. check subscriptionId
  const subscriptionResult = await checkAzureSubscription(
    ctx,
    envInfo,
    tokenProvider.azureAccountProvider
  );
  if (subscriptionResult.isErr()) {
    return err(subscriptionResult.error);
  }

  // Note setSubscription here will change the token returned by getAccountCredentialAsync according to the subscription selected.
  // So getting azureToken needs to precede setSubscription.
  const azureToken = await tokenProvider.azureAccountProvider.getAccountCredentialAsync();
  if (azureToken === undefined) {
    return err(
      new UserError(
        SolutionError.NotLoginToAzure,
        "Login to Azure using the Azure Account extension",
        SolutionSource
      )
    );
  }

  //2. check resource group
  ctx.telemetryReporter?.sendTelemetryEvent(
    TelemetryEvent.CheckResourceGroupStart,
    inputs.env ? { [TelemetryProperty.Env]: getHashedEnv(inputs.env) } : {}
  );

  const rmClient = new ResourceManagementClient(azureToken, envInfo.state.solution.subscriptionId);

  // Resource group info precedence are:
  //   1. ctx.answers, for CLI --resource-group argument, only support existing resource group
  //   2. env config (config.{envName}.json), for user customization, only support existing resource group
  //   3. states (state.{envName}.json), for re-provision
  //   4. asking user with a popup
  const resourceGroupNameFromEnvConfig = envInfo.config.azure?.resourceGroupName;
  const resourceGroupNameFromState = envInfo.state.solution.resourceGroupName;
  const resourceGroupLocationFromState = envInfo.state.solution.location;
  const appName = ctx.projectSetting.appName;
  const defaultResourceGroupName = `${appName.replace(" ", "_")}${"-" + envInfo.envName}-rg`;
  let resourceGroupInfo: ResourceGroupInfo;
  const telemetryProperties: { [key: string]: string } = {};
  if (inputs.env) {
    telemetryProperties[TelemetryProperty.Env] = getHashedEnv(inputs.env);
  }

  if (inputs.targetResourceGroupName) {
    const getRes = await resourceGroupHelper.getResourceGroupInfo(
      inputs.targetResourceGroupName,
      rmClient
    );
    if (getRes.isErr()) return err(getRes.error);
    if (!getRes.value) {
      // Currently we do not support creating resource group from command line arguments
      return err(
        new UserError(
          SolutionError.ResourceGroupNotFound,
          `Resource group '${inputs.targetResourceGroupName}' does not exist, please specify an existing resource group.`,
          SolutionSource
        )
      );
    }
    telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
      CustomizeResourceGroupType.CommandLine;
    resourceGroupInfo = getRes.value;
  } else if (resourceGroupNameFromEnvConfig) {
    const resourceGroupName = resourceGroupNameFromEnvConfig;
    const getRes = await resourceGroupHelper.getResourceGroupInfo(resourceGroupName, rmClient);
    if (getRes.isErr()) return err(getRes.error);
    if (!getRes.value) {
      // Currently we do not support creating resource group by input config, so just throw an error.
      const envFile = EnvConfigFileNameTemplate.replace(EnvNamePlaceholder, inputs.envName);
      return err(
        new UserError(
          SolutionError.ResourceGroupNotFound,
          `Resource group '${resourceGroupName}' does not exist, please check your '${envFile}' file.`,
          SolutionSource
        )
      );
    }
    telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
      CustomizeResourceGroupType.EnvConfig;
    resourceGroupInfo = getRes.value;
  } else if (resourceGroupNameFromState && resourceGroupLocationFromState) {
    const checkRes = await resourceGroupHelper.checkResourceGroupExistence(
      resourceGroupNameFromState,
      rmClient
    );
    if (checkRes.isErr()) {
      return err(checkRes.error);
    }
    const exist = checkRes.value;
    resourceGroupInfo = {
      createNewResourceGroup: !exist,
      name: resourceGroupNameFromState,
      location: resourceGroupLocationFromState,
    };
    telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
      CustomizeResourceGroupType.EnvState;
  } else {
    const resourceGroupInfoResult = await resourceGroupHelper.askResourceGroupInfo(
      ctx,
      inputs,
      tokenProvider.azureAccountProvider,
      rmClient,
      defaultResourceGroupName
    );
    if (resourceGroupInfoResult.isErr()) {
      return err(resourceGroupInfoResult.error);
    }

    resourceGroupInfo = resourceGroupInfoResult.value;
    if (resourceGroupInfo.createNewResourceGroup) {
      if (resourceGroupInfo.name === defaultResourceGroupName) {
        telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
          CustomizeResourceGroupType.InteractiveCreateDefault;
      } else {
        telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
          CustomizeResourceGroupType.InteractiveCreateCustomized;
      }
    } else {
      telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
        CustomizeResourceGroupType.InteractiveUseExisting;
    }
  }

  ctx.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.CheckResourceGroup, telemetryProperties);

  envInfo.state.solution.needCreateResourceGroup = resourceGroupInfo.createNewResourceGroup;
  envInfo.state.solution.resourceGroupName = resourceGroupInfo.name;
  envInfo.state.solution.location = resourceGroupInfo.location;
  ctx.logProvider?.info(`[${PluginDisplayName.Solution}] check resource group pass!`);
  ctx.logProvider?.info(`[${PluginDisplayName.Solution}] check teamsAppTenantId pass!`);

  //resourceNameSuffix
  const resourceNameSuffix =
    (envInfo.config.azure?.resourceNameSuffix as string) ||
    envInfo.state.solution.resourceNameSuffix ||
    uuidv4().substr(0, 6);
  envInfo.state.solution.resourceNameSuffix = resourceNameSuffix;
  ctx.logProvider?.info(`[${PluginDisplayName.Solution}] check resourceNameSuffix pass!`);
  return ok(Void);
}

export async function askForProvisionConsent(
  ctx: v2.Context,
  azureAccountProvider: AzureAccountProvider,
  envInfo: v3.EnvInfoV3
): Promise<Result<Void, FxError>> {
  const azureToken = await azureAccountProvider.getAccountCredentialAsync();

  // Only Azure project requires this confirm dialog
  const username = (azureToken as any).username || "";
  const subscriptionId = envInfo.state.solution?.subscriptionId || "";
  const subscriptionName = envInfo.state.solution?.subscriptionName || "";
  const msgNew = util.format(
    getStrings().solution.ProvisionConfirmEnvNotice,
    envInfo.envName,
    username,
    subscriptionName ? subscriptionName : subscriptionId
  );
  const confirmRes = await ctx.userInteraction.showMessage("warn", msgNew, true, "Provision");
  const confirm = confirmRes?.isOk() ? confirmRes.value : undefined;

  if (confirm !== "Provision") {
    if (confirm === "Pricing calculator") {
      ctx.userInteraction.openUrl("https://azure.microsoft.com/en-us/pricing/calculator/");
    }
    return err(
      new UserError(
        getStrings().solution.CancelProvision,
        getStrings().solution.CancelProvision,
        SolutionSource
      )
    );
  }
  return ok(Void);
}

export async function getM365TenantId(
  appStudioTokenProvider: AppStudioTokenProvider
): Promise<Result<string, FxError>> {
  // Just to trigger M365 login before the concurrent execution of localDebug.
  // Because concurrent execution of localDebug may getAccessToken() concurrently, which
  // causes 2 M365 logins before the token caching in common lib takes effect.
  await appStudioTokenProvider.getAccessToken();
  const appstudioTokenJson = await appStudioTokenProvider.getJsonObject();
  if (appstudioTokenJson === undefined) {
    return err(
      new SystemError(
        SolutionError.NoAppStudioToken,
        "Graph token json is undefined",
        SolutionSource
      )
    );
  }
  const tenantIdInToken = (appstudioTokenJson as any).tid;
  if (!tenantIdInToken || !(typeof tenantIdInToken === "string")) {
    return err(
      new SystemError(
        SolutionError.NoTeamsAppTenantId,
        "Cannot find Teams app tenant id",
        SolutionSource
      )
    );
  }
  return ok(tenantIdInToken);
}
