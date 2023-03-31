// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ResourceManagementClient } from "@azure/arm-resources";
import {
  assembleError,
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
import { v4 as uuidv4 } from "uuid";
import { HelpLinks, PluginDisplayName } from "../common/constants";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { hasAzureResourceV3 } from "../common/projectSettingsHelperV3";
import {
  CustomizeResourceGroupType,
  CustomizeSubscriptionType,
  TelemetryEvent,
  TelemetryProperty,
} from "../common/telemetry";
import { getHashedEnv } from "../common/tools";
import { convertToAlphanumericOnly } from "../common/utils";
import { globalVars, TOOLS } from "../core/globalVars";
import {
  FillInAzureConfigsResult,
  GLOBAL_CONFIG,
  ProvisionSubscriptionCheckResult,
  REMOTE_TEAMS_APP_TENANT_ID,
  SolutionError,
  SolutionSource,
  SolutionTelemetryProperty,
  SUBSCRIPTION_ID,
  BuiltInFeaturePluginNames,
  ComponentNames,
  PathConstants,
  CoordinatorSource,
} from "./constants";
import { backupFiles } from "./utils/backupFiles";
import { resourceGroupHelper, ResourceGroupInfo } from "./utils/ResourceGroupHelper";
import { resetAppSettingsDevelopment } from "./code/appSettingUtils";
import { AppStudioScopes } from "./resource/appManifest/constants";
import { isCSharpProject, resetEnvInfoWhenSwitchM365 } from "./utils";
import fs from "fs-extra";
import { updateAzureParameters } from "./arm";
import path from "path";
import { DeployConfigsConstants } from "../common/azure-hosting/hostingConstant";
import { DriverContext } from "./driver/interface/commonArgs";
import {
  InvalidAzureCredentialError,
  InvalidAzureSubscriptionError,
  ResourceGroupNotExistError,
  SelectSubscriptionError,
} from "../error/azure";
import {
  M365TenantIdNotFoundInTokenError,
  M365TenantIdNotMatchError,
  M365TokenJSONNotFoundError,
} from "../error/m365";
export interface M365TenantRes {
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
      addShouldSkipWriteEnvInfo(tenantInfoInTokenRes.error);
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
        ctx,
        isCSharpProject(ctx.projectSetting.programmingLanguage),
        tenantIdInConfig,
        ctx.tokenProvider.m365TokenProvider,
        inputs
      );
      if (res.isErr()) {
        addShouldSkipWriteEnvInfo(res.error);
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
        addShouldSkipWriteEnvInfo(solutionConfigRes.error);
        return err(solutionConfigRes.error);
      }

      const consentResult = await this.askForProvisionConsent(
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
        addShouldSkipWriteEnvInfo(consentResult.error);
        return err(consentResult.error);
      }

      if (solutionConfigRes.value.hasSwitchedSubscription || hasSwitchedM365Tenant) {
        const handleConfigFilesWhenSwitchAccountsRes = await handleConfigFilesWhenSwitchAccount(
          envInfo as v3.EnvInfoV3,
          ctx,
          inputs,
          hasSwitchedM365Tenant,
          solutionConfigRes.value.hasSwitchedSubscription,
          hasBotServiceCreatedBefore,
          isCSharpProject(ctx.projectSetting.programmingLanguage)
        );

        if (handleConfigFilesWhenSwitchAccountsRes.isErr()) {
          addShouldSkipWriteEnvInfo(handleConfigFilesWhenSwitchAccountsRes.error);
          return err(handleConfigFilesWhenSwitchAccountsRes.error);
        }
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
    } else if (hasSwitchedM365Tenant && !isLocalDebug) {
      const consentResult = await this.askForProvisionConsent(
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
        addShouldSkipWriteEnvInfo(consentResult.error);
        return err(consentResult.error);
      }
      const handleConfigFilesWhenSwitchAccountsRes = await handleConfigFilesWhenSwitchAccount(
        envInfo as v3.EnvInfoV3,
        ctx,
        inputs,
        hasSwitchedM365Tenant,
        false,
        false,
        isCSharpProject(ctx.projectSetting.programmingLanguage)
      );

      if (handleConfigFilesWhenSwitchAccountsRes.isErr()) {
        addShouldSkipWriteEnvInfo(handleConfigFilesWhenSwitchAccountsRes.error);
        return err(handleConfigFilesWhenSwitchAccountsRes.error);
      }
    }
    return ok(undefined);
  }
  /**
   * make sure subscription is correct before provision for V3
   * subscriptionId is provided from .env.xxx file
   */
  async ensureSubscription(
    azureAccountProvider: AzureAccountProvider,
    givenSubscriptionId?: string
  ): Promise<Result<SubscriptionInfo, FxError>> {
    TOOLS.logProvider.info("check whether azure account is signed in.");
    // make sure the user is logged in
    await azureAccountProvider.getIdentityCredentialAsync(true);
    if (!givenSubscriptionId) {
      TOOLS.logProvider.info("subscription is not selected, try to select.");
      try {
        const subscriptionInAccount = await azureAccountProvider.getSelectedSubscription(true);
        if (!subscriptionInAccount) {
          // this case will not happen actually
          return err(new SelectSubscriptionError());
        } else {
          TOOLS.logProvider.info(
            `successful to select subscription: ${subscriptionInAccount.subscriptionId}`
          );
          return ok(subscriptionInAccount);
        }
      } catch (e) {
        return err(assembleError(e));
      }
    }

    // verify valid subscription (permission)
    TOOLS.logProvider.info("subscription is given, try to validate");
    const subscriptions = await azureAccountProvider.listSubscriptions();
    const foundSubscriptionInfo = findSubscriptionFromList(givenSubscriptionId, subscriptions);
    if (!foundSubscriptionInfo) {
      TOOLS.logProvider.info("subscription validate fail");
      return err(new InvalidAzureSubscriptionError(givenSubscriptionId));
    }
    TOOLS.logProvider.info("subscription validate success");
    return ok(foundSubscriptionInfo);
  }
  /**
   * make sure subscription is correct before provision
   *
   */
  async checkProvisionSubscription(
    ctx: v2.Context,
    envInfo: v3.EnvInfoV3,
    azureAccountProvider: AzureAccountProvider,
    targetSubscriptionIdFromCLI: string | undefined,
    envName: string | undefined,
    isResourceGroupOnlyFromCLI: boolean
  ): Promise<Result<ProvisionSubscriptionCheckResult, FxError>> {
    const subscriptionIdInConfig: string | undefined = envInfo.config.azure?.subscriptionId;
    const subscriptionNameInConfig: string | undefined =
      envInfo.config.azure?.subscriptionName || subscriptionIdInConfig;
    const subscriptionIdInState: string | undefined = envInfo.state.solution.subscriptionId;
    const subscriptionNameInState: string | undefined =
      envInfo.state.solution.subscriptionName || subscriptionIdInState;

    ctx.telemetryReporter?.sendTelemetryEvent(
      TelemetryEvent.CheckSubscriptionStart,
      envName ? { [TelemetryProperty.Env]: getHashedEnv(envName) } : {}
    );

    if (!subscriptionIdInState && !subscriptionIdInConfig && !targetSubscriptionIdFromCLI) {
      const subscriptionInAccount = await azureAccountProvider.getSelectedSubscription(true);
      if (!subscriptionInAccount) {
        return err(new SelectSubscriptionError());
      } else {
        this.updateEnvInfoSubscription(envInfo, subscriptionInAccount);
        ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
        ctx.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.CheckSubscription, {
          [TelemetryProperty.Env]: !envName ? "" : getHashedEnv(envName),
          [TelemetryProperty.HasSwitchedSubscription]: "false",
          [TelemetryProperty.CustomizeSubscriptionType]: CustomizeSubscriptionType.Default,
        });
        return ok({ hasSwitchedSubscription: false });
      }
    }

    // make sure the user is logged in
    await azureAccountProvider.getIdentityCredentialAsync(true);
    // verify valid subscription (permission)
    const subscriptions = await azureAccountProvider.listSubscriptions();

    if (targetSubscriptionIdFromCLI) {
      const targetSubscriptionInfo = findSubscriptionFromList(
        targetSubscriptionIdFromCLI,
        subscriptions
      );
      if (!targetSubscriptionInfo) {
        return err(new InvalidAzureSubscriptionError(targetSubscriptionIdFromCLI));
      } else {
        this.updateEnvInfoSubscription(envInfo, targetSubscriptionInfo);
        ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
        return this.compareWithStateSubscription(
          ctx,
          envInfo,
          targetSubscriptionInfo,
          subscriptionIdInState,
          envName,
          CustomizeSubscriptionType.CommandLine
        );
      }
    }

    if (subscriptionIdInConfig && !isResourceGroupOnlyFromCLI) {
      const targetConfigSubInfo = findSubscriptionFromList(subscriptionIdInConfig, subscriptions);

      if (!targetConfigSubInfo) {
        return err(new InvalidAzureSubscriptionError(subscriptionIdInConfig));
      } else {
        return this.compareWithStateSubscription(
          ctx,
          envInfo,
          targetConfigSubInfo,
          subscriptionIdInState,
          envName,
          CustomizeSubscriptionType.EnvConfig
        );
      }
    } else {
      const targetStateSubInfo = subscriptions.find(
        (item) => item.subscriptionId === subscriptionIdInState
      );

      const subscriptionInAccount = await azureAccountProvider.getSelectedSubscription(true);
      if (!subscriptionInAccount) {
        if (targetStateSubInfo) {
          this.updateEnvInfoSubscription(envInfo, targetStateSubInfo);
          ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
          return ok({ hasSwitchedSubscription: false });
        } else {
          return err(new InvalidAzureSubscriptionError(subscriptionIdInState!));
        }
      } else {
        return this.compareWithStateSubscription(
          ctx,
          envInfo,
          subscriptionInAccount,
          subscriptionIdInState,
          envName,
          CustomizeSubscriptionType.EnvState
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
    envName: string | undefined,
    customizeSubscriptionType: CustomizeSubscriptionType
  ): Promise<Result<ProvisionSubscriptionCheckResult, FxError>> {
    const hasSwitchedSubscription =
      !!subscriptionInStateId && targetSubscriptionInfo.subscriptionId !== subscriptionInStateId;
    if (hasSwitchedSubscription) {
      this.updateEnvInfoSubscription(envInfo, targetSubscriptionInfo);
      this.clearEnvInfoStateResource(envInfo);
      ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
      ctx.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.CheckSubscription, {
        [TelemetryProperty.Env]: !envName ? "" : getHashedEnv(envName),
        [TelemetryProperty.HasSwitchedSubscription]: "true",
        [TelemetryProperty.CustomizeSubscriptionType]: customizeSubscriptionType,
      });
      return ok({ hasSwitchedSubscription: true });
    } else {
      this.updateEnvInfoSubscription(envInfo, targetSubscriptionInfo);
      ctx.logProvider.info(`[${PluginDisplayName.Solution}] checkAzureSubscription pass!`);
      ctx.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.CheckSubscription, {
        [TelemetryProperty.Env]: !envName ? "" : getHashedEnv(envName),
        [TelemetryProperty.HasSwitchedSubscription]: "false",
        [TelemetryProperty.CustomizeSubscriptionType]: customizeSubscriptionType,
      });
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

  async ensureResourceGroup(
    azureAccountProvider: AzureAccountProvider,
    subscriptionId: string,
    givenResourceGroupName?: string,
    defaultResourceGroupName?: string
  ): Promise<Result<ResourceGroupInfo, FxError>> {
    const azureToken = await azureAccountProvider.getIdentityCredentialAsync();
    if (azureToken === undefined) {
      return err(new InvalidAzureCredentialError());
    }
    await azureAccountProvider.setSubscription(subscriptionId);
    const rmClient = new ResourceManagementClient(azureToken, subscriptionId);
    let resourceGroupInfo: ResourceGroupInfo;
    if (givenResourceGroupName) {
      const getResourceGroupRes = await resourceGroupHelper.getResourceGroupInfo(
        givenResourceGroupName,
        rmClient
      );
      if (getResourceGroupRes.isErr()) {
        return err(getResourceGroupRes.error);
      } else {
        if (!getResourceGroupRes.value) {
          return err(new ResourceGroupNotExistError(givenResourceGroupName, subscriptionId));
        } else {
          resourceGroupInfo = getResourceGroupRes.value;
        }
      }
    } else {
      const defaultRG = defaultResourceGroupName || "teams-app-rg";
      const rgRes = await resourceGroupHelper.askResourceGroupInfoV3(
        azureAccountProvider,
        rmClient,
        defaultRG
      );
      if (rgRes.isErr()) return err(rgRes.error);
      resourceGroupInfo = rgRes.value;
    }
    return ok(resourceGroupInfo);
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
    const targetSubscriptionIdFromCLI = inputs.targetSubscriptionId;
    const subscriptionResult = await this.checkProvisionSubscription(
      ctx,
      envInfo,
      tokenProvider.azureAccountProvider,
      targetSubscriptionIdFromCLI,
      inputs.env,
      !!inputs.targetResourceGroupName &&
        !targetSubscriptionIdFromCLI &&
        inputs.platform === Platform.CLI
    );

    if (subscriptionResult.isErr()) {
      return err(subscriptionResult.error);
    }

    // Note setSubscription here will change the token returned by getAccountCredentialAsync according to the subscription selected.
    // So getting azureToken needs to precede setSubscription.
    const azureToken = await tokenProvider.azureAccountProvider.getIdentityCredentialAsync();
    if (azureToken === undefined) {
      return err(new InvalidAzureCredentialError());
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
    const appName = convertToAlphanumericOnly(ctx.projectSetting.appName!);
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
            new ResourceGroupNotExistError(
              inputs.targetResourceGroupName,
              envInfo.state.solution.subscriptionId
            )
          );
        }
        telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
          CustomizeResourceGroupType.CommandLine;
        resourceGroupInfo = getRes.value;
      }
    } else if (resourceGroupNameFromEnvConfig && !targetSubscriptionIdFromCLI) {
      const resourceGroupName = resourceGroupNameFromEnvConfig;
      const envFile = EnvConfigFileNameTemplate.replace(EnvNamePlaceholder, envInfo.envName);
      if (!envInfo.config.azure?.subscriptionId) {
        return err(
          new UserError(
            SolutionSource,
            SolutionError.MissingSubscriptionIdInConfig,
            getDefaultString("error.MissingSubscriptionInConfig", resourceGroupName, envFile),
            getLocalizedString("error.MissingSubscriptionInConfig", resourceGroupName, envFile)
          )
        );
      }

      const getRes = await resourceGroupHelper.getResourceGroupInfo(resourceGroupName, rmClient);
      if (getRes.isErr()) return err(getRes.error);
      if (!getRes.value) {
        // Currently we do not support creating resource group by input config, so just throw an error.
        return err(
          new ResourceGroupNotExistError(resourceGroupName, envInfo.state.solution.subscriptionId)
        );
      }
      telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
        CustomizeResourceGroupType.EnvConfig;
      resourceGroupInfo = getRes.value;
    } else if (
      resourceGroupNameFromState &&
      resourceGroupLocationFromState &&
      !targetSubscriptionIdFromCLI
    ) {
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
      return err(new M365TokenJSONNotFoundError());
    }
    const tenantIdInToken = (appStudioTokenJson as any).tid;
    const tenantUserName = (appStudioTokenJson as any).upn;
    if (!tenantIdInToken || !(typeof tenantIdInToken === "string")) {
      return err(new M365TenantIdNotFoundInTokenError());
    }
    return ok({ tenantIdInToken, tenantUserName });
  }
  async askForProvisionConsentV3(
    ctx: DriverContext,
    m365tenant: M365TenantRes | undefined,
    azureSubInfo: SubscriptionInfo,
    envName: string | undefined
  ): Promise<Result<undefined, FxError>> {
    const azureTokenJson = await ctx.azureAccountProvider.getJsonObject();
    const username = (azureTokenJson as any).unique_name || "";

    const azureAccountInfo = getLocalizedString("core.provision.azureAccount", username);
    const azureSubscriptionInfo = getLocalizedString(
      "core.provision.azureSubscription",
      azureSubInfo.subscriptionName
    );
    const accountsInfo = [azureAccountInfo, azureSubscriptionInfo];
    if (m365tenant) {
      const m365AccountInfo = getLocalizedString(
        "core.provision.m365Account",
        m365tenant?.tenantUserName
      );
      accountsInfo.push(m365AccountInfo);
    }

    const confirmMsg = getLocalizedString("core.provision.confirmEnvAndCostNotice", envName);
    const provisionText = getLocalizedString("core.provision.provision");

    const confirmRes = await ctx.ui?.showMessage(
      "warn",
      accountsInfo.join("\n") + "\n\n" + confirmMsg,
      true,
      provisionText
    );
    const confirm = confirmRes?.isOk() ? confirmRes.value : undefined;
    ctx.telemetryReporter?.sendTelemetryEvent(
      TelemetryEvent.ConfirmProvision,
      envName
        ? {
            [TelemetryProperty.Env]: getHashedEnv(envName),
            [SolutionTelemetryProperty.SubscriptionId]: azureSubInfo.subscriptionId,
            [SolutionTelemetryProperty.M365TenantId]: m365tenant?.tenantIdInToken ?? "",
            [SolutionTelemetryProperty.ConfirmRes]: !confirm ? "Cancel" : "Provision",
          }
        : {}
    );
    if (confirm !== provisionText) {
      return err(new UserError("coordinator", "CancelProvision", "CancelProvision"));
    }

    return ok(undefined);
  }

  async ensureM365TenantMatchesV3(
    actions: string[],
    tenantId: string | undefined,
    env: string | undefined,
    source: string
  ): Promise<Result<undefined, FxError>> {
    if (actions.length === 0 || !tenantId) {
      return ok(undefined);
    }

    const hasSwitched =
      !!process.env.TEAMS_APP_TENANT_ID && process.env.TEAMS_APP_TENANT_ID !== tenantId;
    const keysNeedToUpdate: string[] = ["TEAMS_APP_TENANT_ID"];
    if (actions.includes("aadApp/create")) {
      if (process.env.AAD_APP_CLIENT_ID) {
        keysNeedToUpdate.push("AAD_APP_CLIENT_ID");
      }
    }
    if (actions.includes("botAadApp/create") || actions.includes("botFramework/create")) {
      if (process.env.BOT_ID) {
        keysNeedToUpdate.push("BOT_ID");
      }
    }
    const error = new M365TenantIdNotMatchError(
      tenantId,
      process.env.TEAMS_APP_TENANT_ID!,
      keysNeedToUpdate.join(", ")
    );
    error.helpLink = HelpLinks.SwitchTenant;
    return !hasSwitched ? ok(undefined) : err(error);
  }
  async askForProvisionConsent(
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
    const azureTokenJson = await azureAccountProvider.getJsonObject();
    const username = (azureTokenJson as any).unique_name || "";
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

export function findSubscriptionFromList(
  subscriptionId: string,
  subscriptions: SubscriptionInfo[]
): SubscriptionInfo | undefined {
  return subscriptions.find((item) => item.subscriptionId === subscriptionId);
}

function addShouldSkipWriteEnvInfo(error: FxError) {
  if (!error.userData) {
    error.userData = { shouldSkipWriteEnvInfo: true };
  }
}

export async function checkWhetherLocalDebugM365TenantMatches(
  envInfo: v3.EnvInfoV3 | undefined,
  ctx: ResourceContextV3,
  isCSharpProject: boolean,
  localDebugTenantId: string | undefined,
  m365TokenProvider: M365TokenProvider,
  inputs: InputsWithProjectPath
): Promise<Result<Void, FxError>> {
  if (localDebugTenantId) {
    const projectPath = inputs.projectPath;
    const appStudioTokenJsonRes = await m365TokenProvider.getJsonObject({
      scopes: AppStudioScopes,
    });
    const appStudioTokenJson = appStudioTokenJsonRes?.isOk()
      ? appStudioTokenJsonRes.value
      : undefined;
    const maybeM365TenantId = parseTeamsAppTenantId(appStudioTokenJson);
    if (maybeM365TenantId.isErr()) {
      return maybeM365TenantId;
    }

    const maybeM365UserAccount = parseUserName(appStudioTokenJson);
    if (maybeM365UserAccount.isErr()) {
      return maybeM365UserAccount;
    }

    if (maybeM365TenantId.value !== localDebugTenantId) {
      if (
        projectPath !== undefined &&
        (await fs.pathExists(`${projectPath}/bot/.notification.localstore.json`))
      ) {
        const errorMessage = getLocalizedString(
          "core.localDebug.tenantConfirmNoticeWhenAllowSwitchAccount",
          localDebugTenantId,
          maybeM365UserAccount.value,
          "bot/.notification.localstore.json"
        );
        return err(
          new UserError("Solution", SolutionError.CannotLocalDebugInDifferentTenant, errorMessage)
        );
      } else if (envInfo) {
        ctx.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.CheckLocalDebugTenant, {
          [TelemetryProperty.HasSwitchedM365Tenant]: "true",
          [SolutionTelemetryProperty.M365TenantId]: maybeM365TenantId.value,
          [SolutionTelemetryProperty.PreviousM365TenantId]: localDebugTenantId,
        });

        const keys = Object.keys(envInfo.state);
        for (const key of keys) {
          if (key !== "solution") {
            delete (envInfo as v3.EnvInfoV3).state[key];
          }
        }

        if (projectPath !== undefined) {
          const backupFilesRes = await backupFiles(
            envInfo.envName,
            projectPath!,
            isCSharpProject,
            inputs?.platform === Platform.VS,
            ctx
          );
          if (backupFilesRes.isErr()) {
            return err(backupFilesRes.error);
          }

          if (isCSharpProject) {
            await resetAppSettingsDevelopment(projectPath);
          }
        }
      }
    } else {
      ctx.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.CheckLocalDebugTenant, {
        [TelemetryProperty.HasSwitchedM365Tenant]: "false",
        [SolutionTelemetryProperty.M365TenantId]: maybeM365TenantId.value,
        [SolutionTelemetryProperty.PreviousM365TenantId]: localDebugTenantId,
      });
    }
  }

  return ok(Void);
}

export function parseTeamsAppTenantId(
  appStudioToken?: Record<string, unknown>
): Result<string, FxError> {
  if (appStudioToken === undefined) {
    return err(
      new SystemError(
        SolutionSource,
        SolutionError.NoAppStudioToken,
        "Graph token json is undefined"
      )
    );
  }

  const teamsAppTenantId = appStudioToken["tid"];
  if (
    teamsAppTenantId === undefined ||
    !(typeof teamsAppTenantId === "string") ||
    teamsAppTenantId.length === 0
  ) {
    return err(new M365TenantIdNotFoundInTokenError());
  }
  return ok(teamsAppTenantId);
}

export function parseUserName(appStudioToken?: Record<string, unknown>): Result<string, FxError> {
  if (appStudioToken === undefined) {
    return err(
      new SystemError("Solution", SolutionError.NoAppStudioToken, "Graph token json is undefined")
    );
  }

  const userName = appStudioToken["upn"];
  if (userName === undefined || !(typeof userName === "string") || userName.length === 0) {
    return err(
      new SystemError(
        "Solution",
        SolutionError.NoUserName,
        "Cannot find user name from App Studio token."
      )
    );
  }
  return ok(userName);
}
export function hasBotServiceCreated(envInfo: v3.EnvInfoV3): boolean {
  if (!envInfo || !envInfo.state) {
    return false;
  }

  return (
    (!!envInfo.state[BuiltInFeaturePluginNames.bot] &&
      !!envInfo.state[BuiltInFeaturePluginNames.bot]["resourceId"]) ||
    (!!envInfo.state[ComponentNames.TeamsBot] &&
      !!envInfo.state[ComponentNames.TeamsBot]["resourceId"])
  );
}

export async function handleConfigFilesWhenSwitchAccount(
  envInfo: v3.EnvInfoV3,
  context: ResourceContextV3,
  inputs: InputsWithProjectPath,
  hasSwitchedM365Tenant: boolean,
  hasSwitchedSubscription: boolean,
  hasBotServiceCreatedBefore: boolean,
  isCSharpProject: boolean
): Promise<Result<undefined, FxError>> {
  if (!hasSwitchedM365Tenant && !hasSwitchedSubscription) {
    return ok(undefined);
  }

  const backupFilesRes = await backupFiles(
    envInfo.envName,
    inputs.projectPath,
    isCSharpProject,
    inputs.platform === Platform.VS,
    context
  );
  if (backupFilesRes.isErr()) {
    return err(backupFilesRes.error);
  }

  const updateAzureParametersRes = await updateAzureParameters(
    inputs.projectPath,
    context.projectSetting.appName!,
    envInfo.envName,
    hasSwitchedM365Tenant,
    hasSwitchedSubscription,
    hasBotServiceCreatedBefore
  );
  if (updateAzureParametersRes.isErr()) {
    return err(updateAzureParametersRes.error);
  }

  if (hasSwitchedSubscription) {
    const envName = envInfo.envName;
    const maybeBotFolder = path.join(inputs.projectPath, PathConstants.botWorkingDir);
    const maybeBotDeploymentFile = path.join(
      maybeBotFolder,
      path.join(
        DeployConfigsConstants.DEPLOYMENT_FOLDER,
        DeployConfigsConstants.DEPLOYMENT_INFO_FILE
      )
    );
    if (await fs.pathExists(maybeBotDeploymentFile)) {
      try {
        const botDeployJson = await fs.readJSON(maybeBotDeploymentFile);
        const lastTime = Math.max(botDeployJson[envInfo.envName]?.time ?? 0, 0);
        if (lastTime !== 0) {
          botDeployJson[envName] = {
            time: 0,
          };

          await fs.writeJSON(maybeBotDeploymentFile, botDeployJson);
        }
      } catch (exception) {
        // do nothing
      }
    }

    const maybeTabFolder = path.join(inputs.projectPath, PathConstants.tabWorkingDir);
    const maybeTabDeploymentFile = path.join(
      maybeTabFolder,
      path.join(
        DeployConfigsConstants.DEPLOYMENT_FOLDER,
        DeployConfigsConstants.DEPLOYMENT_INFO_FILE
      )
    );
    if (await fs.pathExists(maybeTabDeploymentFile)) {
      try {
        const deploymentInfoJson = await fs.readJSON(maybeTabDeploymentFile);
        if (!!deploymentInfoJson[envName] && !!deploymentInfoJson[envName].lastDeployTime) {
          delete deploymentInfoJson[envName].lastDeployTime;
          await fs.writeJSON(maybeTabDeploymentFile, deploymentInfoJson);
        }
      } catch (exception) {
        // do nothing
      }
    }
  }

  return ok(undefined);
}

export const provisionUtils = new ProvisionUtils();
