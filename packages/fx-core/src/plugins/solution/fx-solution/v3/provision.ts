// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ResourceManagementClient } from "@azure/arm-resources";
import {
  AppStudioTokenProvider,
  AzureAccountProvider,
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
import { assign, isUndefined } from "lodash";
import { Container } from "typedi";
import * as util from "util";
import { PluginDisplayName } from "../../../../common/constants";
import {
  CustomizeResourceGroupType,
  TelemetryEvent,
  TelemetryProperty,
} from "../../../../common/telemetry";
import { getHashedEnv, getResourceGroupInPortal, getStrings } from "../../../../common/tools";
import { PermissionRequestFileProvider } from "../../../../core/permissionRequest";
import { AppStudioPluginV3 } from "../../../resource/appstudio/v3";
import arm from "../arm";
import {
  askResourceGroupInfo,
  checkResourceGroupExistence,
  createNewResourceGroup,
  DefaultResourceGroupLocation,
  getResourceGroupInfo,
  ResourceGroupInfo,
} from "../commonQuestions";
import { SolutionError, SolutionSource } from "../constants";
import { executeConcurrently } from "../v2/executor";
import { combineRecords } from "../v2/utils";
import { BuiltInResourcePluginNames } from "./constants";
import { v4 as uuidv4 } from "uuid";

export async function getQuestionsForProvision(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  tokenProvider: TokenProvider,
  envInfo?: v2.DeepReadonly<v3.EnvInfoV3>
): Promise<Result<QTreeNode | undefined, FxError>> {
  const solutionSetting = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const root = new QTreeNode({ type: "group" });
  for (const pluginName of solutionSetting.activeResourcePlugins) {
    const plugin = Container.get<v3.ResourcePlugin>(pluginName);
    if (plugin.getQuestionsForProvision) {
      const res = await plugin.getQuestionsForProvision(ctx, inputs, tokenProvider, envInfo);
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
  const solutionSetting = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const appStudioPlugin = Container.get<AppStudioPluginV3>(BuiltInResourcePluginNames.appStudio);

  // check M365 tenant
  const checkM365Res = await checkM365Tenant(envInfo, tokenProvider.appStudioToken);
  if (checkM365Res.isErr()) {
    return err(checkM365Res.error);
  }

  // TODO check AAD permission request, can this step moved into AAD's provision() method?
  const aadEnable = solutionSetting.activeResourcePlugins.includes(BuiltInResourcePluginNames.aad);
  if (aadEnable) {
  }

  // ask common question and fill in solution config
  const solutionConfigRes = await fillInAzureSolutionConfigs(
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
  const solutionConfig = envInfo.state.solution as v3.AzureSolutionConfig;
  if (solutionConfig.needCreateResourceGroup) {
    const createRgRes = await createNewResourceGroup(
      tokenProvider.azureAccountProvider,
      solutionConfig.subscriptionId,
      solutionConfig.subscriptionName,
      solutionConfig.resourceGroupName,
      solutionConfig.location,
      ctx.logProvider
    );
    if (createRgRes.isErr()) {
      return err(createRgRes.error);
    }
  }

  // collect plugins and provisionResources
  const plugins = solutionSetting.activeResourcePlugins.map((p) =>
    Container.get<v3.ResourcePlugin>(p)
  );
  const provisionThunks = plugins
    .filter((plugin) => !isUndefined(plugin.provisionResource))
    .map((plugin) => {
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
  if (provisionResult.kind === "failure" || provisionResult.kind === "partialSuccess") {
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
    util.format(getStrings().solution.DeployArmTemplates.SuccessNotice, PluginDisplayName.Solution)
  );

  // TODO call aad.setApplicationInContext
  ctx.logProvider.info(util.format("AAD.setApplicationInContext", PluginDisplayName.Solution));

  // collect plugins and call configureResource
  const configureResourceThunks = plugins
    .filter((plugin) => !isUndefined(plugin.configureResource))
    .map((plugin) => {
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
  if (
    configureResourceResult.kind === "failure" ||
    configureResourceResult.kind === "partialSuccess"
  ) {
    const msg = util.format(getStrings().solution.ProvisionFailNotice, ctx.projectSetting.appName);
    ctx.logProvider.error(msg);
    envStates.solution.provisionSucceeded = false;
    return err(configureResourceResult.error);
  }

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
    ctx.userInteraction.showMessage("info", msg, false, title).then((result) => {
      const userSelected = result.isOk() ? result.value : undefined;
      if (userSelected === title) {
        ctx.userInteraction.openUrl(url);
      }
    });
  } else {
    ctx.userInteraction.showMessage("info", msg, false);
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
  const state = envInfo.state;
  const subscriptionId = envInfo.config.azure?.subscriptionId || state.solution.subscriptionId;
  if (!subscriptionId) {
    const askSubRes = await azureAccountProvider.getSelectedSubscription(true);
    if (askSubRes) return ok(askSubRes);
    return err(
      new UserError(
        SolutionError.SubscriptionNotFound,
        "Failed to select subscription",
        SolutionSource
      )
    );
  }

  let subscriptionName = state.solution.subscriptionName;
  if (subscriptionName.length > 0) {
    subscriptionName = `(${subscriptionName})`;
  }
  // make sure the user is logged in
  await azureAccountProvider.getAccountCredentialAsync(true);

  // verify valid subscription (permission)
  const subscriptions = await azureAccountProvider.listSubscriptions();
  const targetSubInfo = subscriptions.find((item) => item.subscriptionId === subscriptionId);
  if (!targetSubInfo) {
    return err(
      new UserError(
        SolutionError.SubscriptionNotFound,
        `The subscription '${subscriptionId}'${subscriptionName} for '${
          envInfo.envName
        }' environment is not found in the current account, please use the right Azure account or check the '${EnvConfigFileNameTemplate.replace(
          EnvNamePlaceholder,
          envInfo.envName
        )}' file.`,
        SolutionSource
      )
    );
  }
  state.solution.subscriptionId = targetSubInfo.subscriptionId;
  state.solution.subscriptionName = targetSubInfo.subscriptionName;
  state.solution.tenantId = targetSubInfo.tenantId;
  ctx.logProvider.info(`[${PluginDisplayName.Solution}] check subscriptionId pass!`);
  return ok(Void);
}

/**
 * Asks common questions and puts the answers in the global namespace of SolutionConfig
 *
 */
async function fillInAzureSolutionConfigs(
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
    const maybeResourceGroupInfo = await getResourceGroupInfo(
      ctx,
      rmClient,
      inputs.targetResourceGroupName
    );
    if (!maybeResourceGroupInfo) {
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
    resourceGroupInfo = maybeResourceGroupInfo;
  } else if (resourceGroupNameFromEnvConfig) {
    const resourceGroupName = resourceGroupNameFromEnvConfig;
    const maybeResourceGroupInfo = await getResourceGroupInfo(ctx, rmClient, resourceGroupName);
    if (!maybeResourceGroupInfo) {
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
    resourceGroupInfo = maybeResourceGroupInfo;
  } else if (resourceGroupNameFromState && resourceGroupLocationFromState) {
    const maybeExist = await checkResourceGroupExistence(
      rmClient,
      resourceGroupNameFromState,
      envInfo.state.solution.subscriptionId,
      envInfo.state.solution.subscriptionName
    );
    if (maybeExist.isErr()) {
      return err(maybeExist.error);
    }
    const exist = maybeExist.value;
    resourceGroupInfo = {
      createNewResourceGroup: !exist,
      name: resourceGroupNameFromState,
      location: resourceGroupLocationFromState,
    };

    telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
      CustomizeResourceGroupType.EnvState;
  } else {
    const resourceGroupInfoResult = await askResourceGroupInfo(
      ctx,
      tokenProvider.azureAccountProvider,
      rmClient,
      inputs,
      ctx.userInteraction,
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
  const subscriptionId = envInfo.state.solution.subscriptionId;
  const subscriptionName = envInfo.state.solution.subscriptionName;
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

async function checkM365Tenant(
  envInfo: v3.EnvInfoV3,
  appStudioTokenProvider: AppStudioTokenProvider
): Promise<Result<Void, FxError>> {
  await appStudioTokenProvider.getAccessToken();
  const appResource = envInfo.state[BuiltInResourcePluginNames.appStudio] as v3.TeamsAppResource;
  const m365TenantId = appResource.tenantId;
  if (!m365TenantId) {
    return ok(Void);
  }
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
  const teamsAppTenantId = (appstudioTokenJson as any).tid;
  if (
    teamsAppTenantId === undefined ||
    !(typeof teamsAppTenantId === "string") ||
    teamsAppTenantId.length === 0
  ) {
    return err(
      new SystemError(
        SolutionError.NoTeamsAppTenantId,
        "Cannot find Teams app tenant id",
        SolutionSource
      )
    );
  }
  if (teamsAppTenantId !== m365TenantId) {
    return err(
      new UserError(
        SolutionError.TeamsAppTenantIdNotRight,
        `The signed in M365 account does not match the M365 tenant used in previous provision for '${envInfo.envName}' environment. Please sign out and sign in with the correct M365 account.`,
        "Solution"
      )
    );
  }
  appResource.tenantId = teamsAppTenantId;
  return ok(Void);
}
