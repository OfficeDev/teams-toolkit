// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ResourceManagementClient } from "@azure/arm-resources";
import {
  AzureAccountProvider,
  ContextV3,
  EnvConfigFileNameTemplate,
  EnvNamePlaceholder,
  err,
  FxError,
  InputsWithProjectPath,
  Json,
  M365TokenProvider,
  ok,
  Platform,
  ResourceContextV3,
  Result,
  SubscriptionInfo,
  SystemError,
  TokenProvider,
  UserError,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { snakeCase } from "lodash";
import { v4 as uuidv4 } from "uuid";
import { PluginDisplayName } from "../common/constants";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { hasAzureResourceV3 } from "../common/projectSettingsHelperV3";
import { CustomizeResourceGroupType, TelemetryEvent, TelemetryProperty } from "../common/telemetry";
import { getHashedEnv } from "../common/tools";
import { convertToAlphanumericOnly } from "../common/utils";
import { globalVars } from "../core";
import {
  FillInAzureConfigsResult,
  GLOBAL_CONFIG,
  ProvisionSubscriptionCheckResult,
  REMOTE_TEAMS_APP_TENANT_ID,
  SolutionError,
  SolutionSource,
  SolutionTelemetryProperty,
  SUBSCRIPTION_ID,
} from "../plugins/solution/fx-solution/constants";
import {
  resourceGroupHelper,
  ResourceGroupInfo,
} from "../plugins/solution/fx-solution/utils/ResourceGroupHelper";
import {
  handleConfigFilesWhenSwitchAccount,
  hasBotServiceCreated,
} from "../plugins/solution/fx-solution/utils/util";
import { checkWhetherLocalDebugM365TenantMatches } from "../plugins/solution/fx-solution/v2/utils";
import { BuiltInFeaturePluginNames } from "../plugins/solution/fx-solution/v3/constants";
import { ComponentNames } from "./constants";
import { AppStudioScopes } from "./resource/appManifest/constants";
import { resetEnvInfoWhenSwitchM365 } from "./utils";

interface M365TenantRes {
  tenantIdInToken: string;
  tenantUserName: string;
}

export class ProvisionUtils {
  async preProvision(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const ctx = context as ResourceContextV3;
    const envInfo = ctx.envInfo;
    const hasBotServiceCreatedBefore = hasBotServiceCreated(envInfo as v3.EnvInfoV3);

    // 1. check M365 tenant
    envInfo.state[ComponentNames.AppManifest] = envInfo.state[ComponentNames.AppManifest] || {};
    envInfo.state.solution = envInfo.state.solution || {};
    const appManifest = envInfo.state[ComponentNames.AppManifest];
    const solutionConfig = envInfo.state.solution;
    solutionConfig.provisionSucceeded = false;
    const tenantIdInConfig = appManifest.tenantId;

    const isLocalDebug = envInfo.envName === "local";
    const tenantInfoInTokenRes = await this.getM365TenantId(ctx.tokenProvider.m365TokenProvider);
    if (tenantInfoInTokenRes.isErr()) {
      return err(tenantInfoInTokenRes.error);
    }
    const tenantIdInToken = tenantInfoInTokenRes.value.tenantIdInToken;
    const hasSwitchedM365Tenant =
      !!tenantIdInConfig && !!tenantIdInToken && tenantIdInToken !== tenantIdInConfig;

    if (!isLocalDebug) {
      if (hasSwitchedM365Tenant) {
        resetEnvInfoWhenSwitchM365(envInfo);
      }
    } else {
      const res = await checkWhetherLocalDebugM365TenantMatches(
        envInfo,
        ctx.telemetryReporter,
        tenantIdInConfig,
        ctx.tokenProvider.m365TokenProvider,
        inputs.projectPath
      );
      if (res.isErr()) {
        return err(res.error);
      }
    }

    envInfo.state[ComponentNames.AppManifest] = envInfo.state[ComponentNames.AppManifest] || {};
    envInfo.state[ComponentNames.AppManifest].tenantId = tenantIdInToken;
    envInfo.state.solution.teamsAppTenantId = tenantIdInToken;
    globalVars.m365TenantId = tenantIdInToken;

    // 3. check Azure configs
    if (hasAzureResourceV3(ctx.projectSetting) && envInfo.envName !== "local") {
      // ask common question and fill in solution config
      const subscriptionIdInState = envInfo.state.solution.subscriptionId;
      const solutionConfigRes = await this.fillInAzureConfigs(
        ctx,
        inputs,
        envInfo,
        ctx.tokenProvider
      );
      if (solutionConfigRes.isErr()) {
        return err(solutionConfigRes.error);
      }

      const consentResult = await this.askForProvisionConsentNew(
        ctx,
        ctx.tokenProvider.azureAccountProvider,
        envInfo as v3.EnvInfoV3,
        hasSwitchedM365Tenant,
        solutionConfigRes.value.hasSwitchedSubscription,
        tenantInfoInTokenRes.value.tenantUserName,
        true,
        tenantIdInConfig,
        subscriptionIdInState
      );
      if (consentResult.isErr()) {
        return err(consentResult.error);
      }

      // create resource group if needed
      if (solutionConfig.needCreateResourceGroup) {
        const createRgRes = await resourceGroupHelper.createNewResourceGroup(
          solutionConfig.resourceGroupName,
          ctx.tokenProvider.azureAccountProvider,
          solutionConfig.subscriptionId,
          solutionConfig.location
        );
        if (createRgRes.isErr()) {
          return err(createRgRes.error);
        }
      }

      if (solutionConfigRes.value.hasSwitchedSubscription || hasSwitchedM365Tenant) {
        const handleConfigFilesWhenSwitchAccountsRes = await handleConfigFilesWhenSwitchAccount(
          envInfo as v3.EnvInfoV3,
          ctx.projectSetting.appName,
          inputs.projectPath,
          hasSwitchedM365Tenant,
          solutionConfigRes.value.hasSwitchedSubscription,
          hasBotServiceCreatedBefore
        );

        if (handleConfigFilesWhenSwitchAccountsRes.isErr()) {
          return err(handleConfigFilesWhenSwitchAccountsRes.error);
        }
      }
    } else if (hasSwitchedM365Tenant && !isLocalDebug) {
      const consentResult = await this.askForProvisionConsentNew(
        ctx,
        ctx.tokenProvider.azureAccountProvider,
        envInfo as v3.EnvInfoV3,
        hasSwitchedM365Tenant,
        false,
        tenantInfoInTokenRes.value.tenantUserName,
        false,
        tenantIdInConfig
      );
      if (consentResult.isErr()) {
        return err(consentResult.error);
      }
      const handleConfigFilesWhenSwitchAccountsRes = await handleConfigFilesWhenSwitchAccount(
        envInfo as v3.EnvInfoV3,
        ctx.projectSetting.appName,
        inputs.projectPath,
        hasSwitchedM365Tenant,
        false,
        false
      );

      if (handleConfigFilesWhenSwitchAccountsRes.isErr()) {
        return err(handleConfigFilesWhenSwitchAccountsRes.error);
      }
    }
    return ok(undefined);
  }

  /**
   * make sure subscription is correct before provision
   *
   */
  async checkProvisionSubscriptionWhenSwitchAccountEnabled(
    ctx: v2.Context,
    envInfo: v3.EnvInfoV3,
    azureAccountProvider: AzureAccountProvider
  ): Promise<Result<ProvisionSubscriptionCheckResult, FxError>> {
    const subscriptionIdInConfig: string | undefined = envInfo.config.azure?.subscriptionId;
    const subscriptionNameInConfig: string | undefined =
      envInfo.config.azure?.subscriptionName || subscriptionIdInConfig;
    const subscriptionIdInState: string | undefined = envInfo.state.solution.subscriptionId;
    const subscriptionNameInState: string | undefined =
      envInfo.state.solution.subscriptionName || subscriptionIdInState;

    const subscriptionInAccount = await azureAccountProvider.getSelectedSubscription(true);

    if (!subscriptionIdInState && !subscriptionIdInConfig) {
      if (!subscriptionInAccount) {
        return err(
          new UserError(
            SolutionSource,
            SolutionError.SubscriptionNotFound,
            "Failed to select subscription"
          )
        );
      } else {
        this.updateEnvInfoSubscription(envInfo, subscriptionInAccount);
        ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
        return ok({ hasSwitchedSubscription: false });
      }
    }

    // make sure the user is logged in
    await azureAccountProvider.getAccountCredentialAsync(true);
    // verify valid subscription (permission)
    const subscriptions = await azureAccountProvider.listSubscriptions();

    if (subscriptionIdInConfig) {
      const targetConfigSubInfo = subscriptions.find(
        (item) => item.subscriptionId === subscriptionIdInConfig
      );

      if (!targetConfigSubInfo) {
        return err(
          new UserError(
            SolutionSource,
            SolutionError.SubscriptionNotFound,
            `The subscription '${subscriptionIdInConfig}'(${subscriptionNameInConfig}) for '${
              envInfo.envName
            }' environment is not found in the current account, please use the right Azure account or check the '${EnvConfigFileNameTemplate.replace(
              EnvNamePlaceholder,
              envInfo.envName
            )}' file.`
          )
        );
      } else {
        return this.compareWithStateSubscription(
          ctx,
          envInfo,
          targetConfigSubInfo,
          subscriptionIdInState,
          subscriptionNameInState,
          azureAccountProvider
        );
      }
    } else {
      const targetStateSubInfo = subscriptions.find(
        (item) => item.subscriptionId === subscriptionIdInState
      );

      if (!subscriptionInAccount) {
        if (targetStateSubInfo) {
          this.updateEnvInfoSubscription(envInfo, targetStateSubInfo);
          ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
          return ok({ hasSwitchedSubscription: false });
        } else {
          return err(
            new UserError(
              SolutionSource,
              SolutionError.SubscriptionNotFound,
              `The subscription '${subscriptionIdInState}'(${subscriptionNameInState}) for '${envInfo.envName}' environment is not found in the current account, please use the right Azure account.`
            )
          );
        }
      } else {
        return this.compareWithStateSubscription(
          ctx,
          envInfo,
          subscriptionInAccount,
          subscriptionIdInState,
          subscriptionNameInState,
          azureAccountProvider
        );
      }
    }
  }

  updateEnvInfoSubscription(envInfo: v3.EnvInfoV3, subscriptionInfo: SubscriptionInfo) {
    envInfo.state.solution.subscriptionId = subscriptionInfo.subscriptionId;
    envInfo.state.solution.subscriptionName = subscriptionInfo.subscriptionName;
    envInfo.state.solution.tenantId = subscriptionInfo.tenantId;
  }

  async compareWithStateSubscription(
    ctx: v2.Context,
    envInfo: v3.EnvInfoV3,
    targetSubscriptionInfo: SubscriptionInfo,
    subscriptionInStateId: string | undefined,
    subscriptionInStateName: string | undefined,
    azureAccountProvider: AzureAccountProvider
  ): Promise<Result<ProvisionSubscriptionCheckResult, FxError>> {
    const hasSwitchedSubscription =
      !!subscriptionInStateId && targetSubscriptionInfo.subscriptionId !== subscriptionInStateId;
    if (hasSwitchedSubscription) {
      this.updateEnvInfoSubscription(envInfo, targetSubscriptionInfo);
      this.clearEnvInfoStateResource(envInfo);

      ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
      return ok({ hasSwitchedSubscription: true });
    } else {
      this.updateEnvInfoSubscription(envInfo, targetSubscriptionInfo);
      ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
      return ok({ hasSwitchedSubscription: false });
    }
  }

  // clear resources related info in envInfo so that we could provision successfully using new sub.
  clearEnvInfoStateResource(envInfo: v3.EnvInfoV3): void {
    envInfo.state.solution.resourceGroupName = "";
    envInfo.state.solution.resourceNameSuffix = "";

    const keysToClear = [
      BuiltInFeaturePluginNames.bot,
      BuiltInFeaturePluginNames.frontend,
      BuiltInFeaturePluginNames.function,
      BuiltInFeaturePluginNames.identity,
      BuiltInFeaturePluginNames.keyVault,
      BuiltInFeaturePluginNames.sql,
      BuiltInFeaturePluginNames.simpleAuth,
      ComponentNames.TeamsBot,
      ComponentNames.TeamsTab,
      ComponentNames.TeamsApi,
      ComponentNames.Identity,
      ComponentNames.KeyVault,
      ComponentNames.AzureSQL,
    ];

    const keysToModify = [BuiltInFeaturePluginNames.apim, ComponentNames.APIM];
    const keys = Object.keys(envInfo.state);
    for (const key of keys) {
      if (keysToClear.includes(key)) {
        delete envInfo.state[key];
      }

      if (keysToModify.includes(key)) {
        delete envInfo.state[key]["serviceResourceId"];
      }
    }
  }

  /**
   * Asks common questions and puts the answers in the global namespace of SolutionConfig
   *
   */
  async fillInAzureConfigs(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<Result<FillInAzureConfigsResult, FxError>> {
    //1. check subscriptionId
    ctx.telemetryReporter?.sendTelemetryEvent(
      TelemetryEvent.CheckSubscriptionStart,
      inputs.env ? { [TelemetryProperty.Env]: getHashedEnv(inputs.env) } : {}
    );

    const subscriptionResult = await this.checkProvisionSubscriptionWhenSwitchAccountEnabled(
      ctx,
      envInfo,
      tokenProvider.azureAccountProvider
    );

    if (subscriptionResult.isErr()) {
      return err(subscriptionResult.error);
    }

    ctx.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.CheckSubscription, {
      [TelemetryProperty.Env]: !inputs.env ? "" : getHashedEnv(inputs.env),
      [TelemetryProperty.HasSwitchedSubscription]:
        subscriptionResult.value.hasSwitchedSubscription.toString(),
    });

    // Note setSubscription here will change the token returned by getAccountCredentialAsync according to the subscription selected.
    // So getting azureToken needs to precede setSubscription.
    const azureToken = await tokenProvider.azureAccountProvider.getIdentityCredentialAsync();
    if (azureToken === undefined) {
      return err(
        new UserError(
          SolutionSource,
          SolutionError.NotLoginToAzure,
          "Login to Azure using the Azure Account extension"
        )
      );
    }

    //2. check resource group
    ctx.telemetryReporter?.sendTelemetryEvent(
      TelemetryEvent.CheckResourceGroupStart,
      inputs.env ? { [TelemetryProperty.Env]: getHashedEnv(inputs.env) } : {}
    );

    const rmClient = new ResourceManagementClient(
      azureToken,
      envInfo.state.solution.subscriptionId
    );

    // Resource group info precedence are:
    //   0. ctx.answers, for VS targetResourceGroupName and targetResourceLocationName to create a new rg
    //   1. ctx.answers, for CLI --resource-group argument, only support existing resource group
    //   2. env config (config.{envName}.json), for user customization, only support existing resource group
    //   3. states (state.{envName}.json), for re-provision
    //   4. asking user with a popup
    const resourceGroupNameFromEnvConfig = envInfo.config.azure?.resourceGroupName;
    const resourceGroupNameFromState = envInfo.state.solution.resourceGroupName;
    const resourceGroupLocationFromState = envInfo.state.solution.location;
    const appName = convertToAlphanumericOnly(ctx.projectSetting.appName);
    const defaultResourceGroupName = `${snakeCase(appName)}${"-" + envInfo.envName}-rg`;
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
      if (getRes.isErr()) {
        // support vs to create a new resource group
        if (inputs.platform === Platform.VS && inputs.targetResourceLocationName) {
          resourceGroupInfo = {
            createNewResourceGroup: true,
            name: inputs.targetResourceGroupName,
            location: inputs.targetResourceLocationName,
          };
        } else return err(getRes.error);
      } else {
        if (!getRes.value) {
          // Currently we do not support creating resource group from command line arguments
          return err(
            new UserError(
              SolutionSource,
              SolutionError.ResourceGroupNotFound,
              `Resource group '${inputs.targetResourceGroupName}' does not exist, please specify an existing resource group.`
            )
          );
        }
        telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
          CustomizeResourceGroupType.CommandLine;
        resourceGroupInfo = getRes.value;
      }
    } else if (resourceGroupNameFromEnvConfig) {
      const resourceGroupName = resourceGroupNameFromEnvConfig;
      const getRes = await resourceGroupHelper.getResourceGroupInfo(resourceGroupName, rmClient);
      if (getRes.isErr()) return err(getRes.error);
      if (!getRes.value) {
        // Currently we do not support creating resource group by input config, so just throw an error.
        const envFile = EnvConfigFileNameTemplate.replace(EnvNamePlaceholder, inputs.envName);
        return err(
          new UserError(
            SolutionSource,
            SolutionError.ResourceGroupNotFound,
            `Resource group '${resourceGroupName}' does not exist, please check your '${envFile}' file.`
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

    ctx.telemetryReporter?.sendTelemetryEvent(
      TelemetryEvent.CheckResourceGroup,
      telemetryProperties
    );

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
    return ok({ hasSwitchedSubscription: subscriptionResult.value.hasSwitchedSubscription });
  }

  async askForProvisionConsent(
    ctx: v2.Context,
    azureAccountProvider: AzureAccountProvider,
    envInfo: v3.EnvInfoV3
  ): Promise<Result<Void, FxError>> {
    const azureToken = await azureAccountProvider.getAccountCredentialAsync();

    // Only Azure project requires this confirm dialog
    const username = (azureToken as any).username || "";
    const subscriptionId = envInfo.state.solution?.subscriptionId || "";
    const subscriptionName = envInfo.state.solution?.subscriptionName || "";
    const msgNew = getLocalizedString(
      "core.provision.confirmEnvNotice",
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
      return err(new UserError(SolutionSource, "CancelProvision", "CancelProvision"));
    }
    return ok(Void);
  }

  async getM365TenantId(
    m365TokenProvider: M365TokenProvider
  ): Promise<Result<M365TenantRes, FxError>> {
    // Just to trigger M365 login before the concurrent execution of localDebug.
    // Because concurrent execution of localDebug may getAccessToken() concurrently, which
    // causes 2 M365 logins before the token caching in common lib takes effect.
    const appStudioTokenRes = await m365TokenProvider.getAccessToken({ scopes: AppStudioScopes });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioTokenJsonRes = await m365TokenProvider.getJsonObject({
      scopes: AppStudioScopes,
    });
    const appStudioTokenJson = appStudioTokenJsonRes.isOk()
      ? appStudioTokenJsonRes.value
      : undefined;
    if (appStudioTokenJson === undefined) {
      return err(
        new SystemError(
          SolutionSource,
          SolutionError.NoAppStudioToken,
          getDefaultString("error.NoAppStudioToken"),
          getLocalizedString("error.NoAppStudioToken")
        )
      );
    }
    const tenantIdInToken = (appStudioTokenJson as any).tid;
    const tenantUserName = (appStudioTokenJson as any).upn;
    if (!tenantIdInToken || !(typeof tenantIdInToken === "string")) {
      return err(
        new SystemError(
          SolutionSource,
          SolutionError.NoTeamsAppTenantId,
          getDefaultString("error.NoTeamsAppTenantId"),
          getLocalizedString("error.NoTeamsAppTenantId")
        )
      );
    }
    return ok({ tenantIdInToken, tenantUserName });
  }

  async askForProvisionConsentNew(
    ctx: v2.Context,
    azureAccountProvider: AzureAccountProvider,
    envInfo: v3.EnvInfoV3,
    hasSwitchedM365Tenant: boolean,
    hasSwitchedSubscription: boolean,
    m365AccountName: string,
    hasAzureResource: boolean,
    previousM365TenantId: string,
    previousSubscriptionId?: string
  ): Promise<Result<Void, FxError>> {
    const azureToken = await azureAccountProvider.getAccountCredentialAsync();
    const username = (azureToken as any).username || "";
    const subscriptionId = envInfo.state.solution?.subscriptionId || "";
    const subscriptionName = envInfo.state.solution?.subscriptionName || "";
    const m365TenantId = envInfo.state.solution?.teamsAppTenantId || "";

    let switchedNotice = "";

    if (hasSwitchedM365Tenant && hasSwitchedSubscription) {
      switchedNotice = getLocalizedString(
        "core.provision.switchedM365AccountAndAzureSubscriptionNotice"
      );
    } else if (hasSwitchedM365Tenant && !hasSwitchedSubscription) {
      switchedNotice = getLocalizedString("core.provision.switchedM365AccountNotice");
    } else if (!hasSwitchedM365Tenant && hasSwitchedSubscription) {
      switchedNotice = getLocalizedString("core.provision.switchedAzureSubscriptionNotice");

      const botResource =
        envInfo.state[BuiltInFeaturePluginNames.bot] ?? envInfo.state[ComponentNames.TeamsBot];
      const newBotNotice =
        !!botResource && !!botResource["resourceId"]
          ? getLocalizedString("core.provision.createNewAzureBotNotice")
          : "";

      switchedNotice = switchedNotice + newBotNotice;
    }

    const azureAccountInfo = getLocalizedString("core.provision.azureAccount", username);
    const azureSubscriptionInfo = getLocalizedString(
      "core.provision.azureSubscription",
      subscriptionName ? subscriptionName : subscriptionId
    );
    const m365AccountInfo = getLocalizedString(
      "core.provision.m365Account",
      m365AccountName ? m365AccountName : m365TenantId
    );

    let accountsInfo = "";
    if (!switchedNotice && !hasAzureResource) {
      return ok(Void);
    } else if (!switchedNotice && hasAzureResource) {
      accountsInfo = [azureAccountInfo, azureSubscriptionInfo, m365AccountInfo].join("\n");
    } else {
      // switchedNotice
      accountsInfo = hasAzureResource
        ? [switchedNotice, azureAccountInfo, azureSubscriptionInfo, m365AccountInfo].join("\n")
        : [switchedNotice, m365AccountInfo].join("\n");
    }

    const confirmMsg = hasAzureResource
      ? getLocalizedString("core.provision.confirmEnvAndCostNotice", envInfo.envName)
      : hasSwitchedM365Tenant
      ? getLocalizedString("core.provision.confirmEnvOnlyNotice", envInfo.envName)
      : "";

    const provisionText = getLocalizedString("core.provision.provision");
    const learnMoreText = getLocalizedString("core.provision.learnMore");
    const items =
      hasSwitchedM365Tenant || hasSwitchedSubscription
        ? [provisionText, learnMoreText]
        : [provisionText];

    let confirm: string | undefined;
    do {
      const confirmRes = await ctx.userInteraction.showMessage(
        "warn",
        accountsInfo + "\n\n" + confirmMsg,
        true,
        ...items
      );
      confirm = confirmRes?.isOk() ? confirmRes.value : undefined;
      ctx.telemetryReporter?.sendTelemetryEvent(
        TelemetryEvent.ConfirmProvision,
        envInfo.envName
          ? {
              [TelemetryProperty.Env]: getHashedEnv(envInfo.envName),
              [TelemetryProperty.HasSwitchedM365Tenant]: hasSwitchedM365Tenant.toString(),
              [TelemetryProperty.HasSwitchedSubscription]: hasSwitchedSubscription.toString(),
              [SolutionTelemetryProperty.SubscriptionId]: getSubscriptionId(envInfo.state),
              [SolutionTelemetryProperty.M365TenantId]: getTeamsAppTenantId(envInfo.state),
              [SolutionTelemetryProperty.PreviousM365TenantId]: previousM365TenantId,
              [SolutionTelemetryProperty.PreviousSubsriptionId]: previousSubscriptionId ?? "",
              [SolutionTelemetryProperty.ConfirmRes]: !confirm
                ? "Error"
                : confirm === learnMoreText
                ? "Learn more"
                : confirm === provisionText
                ? "Provision"
                : "",
            }
          : {}
      );
      if (confirm !== provisionText) {
        if (confirm === learnMoreText) {
          ctx.userInteraction.openUrl("https://aka.ms/teamsfx-switch-tenant-or-subscription-help");
        } else {
          return err(new UserError(SolutionSource, "CancelProvision", "CancelProvision"));
        }
      }
    } while (confirm === learnMoreText);

    return ok(Void);
  }
}

export function getSubscriptionId(state: Json): string {
  if (state && state[GLOBAL_CONFIG] && state[GLOBAL_CONFIG][SUBSCRIPTION_ID]) {
    return state[GLOBAL_CONFIG][SUBSCRIPTION_ID];
  }
  return "";
}

export function getTeamsAppTenantId(state: Json): string {
  if (state && state[GLOBAL_CONFIG] && state[GLOBAL_CONFIG][REMOTE_TEAMS_APP_TENANT_ID]) {
    return state[GLOBAL_CONFIG][REMOTE_TEAMS_APP_TENANT_ID];
  }
  return "";
}

export const provisionUtils = new ProvisionUtils();
