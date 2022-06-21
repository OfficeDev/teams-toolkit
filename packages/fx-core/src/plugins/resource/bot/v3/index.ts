// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks";
import {
  AzureAccountProvider,
  AzureSolutionSettings,
  EnvConfig,
  err,
  FxError,
  Inputs,
  MultiSelectQuestion,
  ok,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import { Service } from "typedi";
import { Bicep, ConstantString } from "../../../../common/constants";
import {
  AppStudioScopes,
  generateBicepFromFile,
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getSubscriptionIdFromResourceId,
  GraphScopes,
} from "../../../../common/tools";
import { CommonErrorHandlerMW } from "../../../../core/middleware/CommonErrorHandlerMW";
import { getTemplatesFolder } from "../../../../folder";
import {
  AzureSolutionQuestionNames,
  BotOptionItem,
  MessageExtensionItem,
} from "../../../solution/fx-solution/question";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import {
  AzureConstants,
  BotBicep,
  DeployConfigs,
  FolderNames,
  MaxLengths,
  PathInfo,
  ProgressBarConstants,
  TemplateProjectsConstants,
  TemplateProjectsScenarios,
} from "../constants";
import { LanguageStrategy } from "../languageStrategy";
import { ProgressBarFactory } from "../progressBars";
import { Messages } from "../resources/messages";
import fs from "fs-extra";
import { CommonStrings, ConfigNames, PluginLocalDebug } from "../resources/strings";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import * as factory from "../clientFactory";
import { ResourceNameFactory } from "../utils/resourceNameFactory";
import { AADRegistration } from "../aadRegistration";
import { IBotRegistration } from "../appStudio/interfaces/IBotRegistration";
import { AppStudio } from "../appStudio/appStudio";
import { DeployMgr } from "../deployMgr";
import * as utils from "../utils/common";
import * as appService from "@azure/arm-appservice";
import { getZipDeployEndpoint } from "../utils/zipDeploy";
import {
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../../../common/template-utils/templatesActions";
import { ProgrammingLanguage } from "../enums/programmingLanguage";
import {
  CheckThrowSomethingMissing,
  PackDirectoryExistenceError,
  PreconditionError,
  TemplateZipFallbackError,
  UnzipError,
} from "./error";
import { ensureSolutionSettings } from "../../../solution/fx-solution/utils/solutionSettingsHelper";
import { AzureOperations } from "../../../../common/azure-hosting/azureOps";
import { AzureUploadConfig } from "../../../../common/azure-hosting/interfaces";
import { convertToAlphanumericOnly } from "../../../../common/utils";

@Service(BuiltInFeaturePluginNames.bot)
export class NodeJSBotPluginV3 implements v3.PluginV3 {
  name = BuiltInFeaturePluginNames.bot;
  displayName = "NodeJS Bot";
  getProgrammingLanguage(ctx: v2.Context): ProgrammingLanguage {
    const rawProgrammingLanguage = ctx.projectSetting.programmingLanguage;
    if (
      rawProgrammingLanguage &&
      utils.existsInEnumValues(rawProgrammingLanguage, ProgrammingLanguage)
    ) {
      return rawProgrammingLanguage as ProgrammingLanguage;
    }
    return ProgrammingLanguage.JavaScript;
  }
  getLangKey(ctx: v2.Context): string {
    const rawProgrammingLanguage = ctx.projectSetting.programmingLanguage;
    if (
      rawProgrammingLanguage &&
      utils.existsInEnumValues(rawProgrammingLanguage, ProgrammingLanguage)
    ) {
      const programmingLanguage = rawProgrammingLanguage as ProgrammingLanguage;
      return utils.convertToLangKey(programmingLanguage);
    }
    return "js";
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async generateCode(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider.info(Messages.ScaffoldingBot);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    if (solutionSettings.activeResourcePlugins.includes(this.name)) return ok(Void);
    const handler = await ProgressBarFactory.newProgressBar(
      ProgressBarConstants.SCAFFOLD_TITLE,
      ProgressBarConstants.SCAFFOLD_STEPS_NUM,
      ctx
    );
    await handler?.start(ProgressBarConstants.SCAFFOLD_STEP_START);
    const group_name = TemplateProjectsConstants.GROUP_NAME_BOT_MSGEXT;
    const lang = this.getLangKey(ctx);
    const workingDir = path.join(inputs.projectPath, CommonStrings.BOT_WORKING_DIR_NAME);

    await handler?.next(ProgressBarConstants.SCAFFOLD_STEP_FETCH_ZIP);
    await scaffoldFromTemplates({
      group: group_name,
      lang: lang,
      scenario: TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME,
      dst: workingDir,
      onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {
        if (action.name === ScaffoldActionName.FetchTemplatesUrlWithTag) {
          ctx.logProvider.info(Messages.SuccessfullyRetrievedTemplateZip(context.zipUrl ?? ""));
        }
      },
      onActionError: async (action: ScaffoldAction, context: ScaffoldContext, error: Error) => {
        ctx.logProvider.info(error.toString());
        switch (action.name) {
          case ScaffoldActionName.FetchTemplatesUrlWithTag:
          case ScaffoldActionName.FetchTemplatesZipFromUrl:
            ctx.logProvider.info(Messages.FallingBackToUseLocalTemplateZip);
            break;
          case ScaffoldActionName.FetchTemplateZipFromLocal:
            throw new TemplateZipFallbackError();
          case ScaffoldActionName.Unzip:
            throw new UnzipError(context.dst);
          default:
            throw new Error(error.message);
        }
      },
    });
    ctx.logProvider.info(Messages.SuccessfullyScaffoldedBot);
    handler?.end(true);
    return ok(Void);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async generateBicep(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.AddFeatureInputs
  ): Promise<Result<v3.BicepTemplate[], FxError>> {
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    if (solutionSettings.activeResourcePlugins.includes(this.name)) return ok([]);
    const pluginCtx = { plugins: inputs.allPluginsAfterAdd };
    const bicepTemplateDir = path.join(getTemplatesFolder(), PathInfo.BicepTemplateRelativeDir);
    const provisionOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDir, Bicep.ProvisionFileName),
      pluginCtx
    );
    const provisionModules = await generateBicepFromFile(
      path.join(bicepTemplateDir, PathInfo.ProvisionModuleTemplateFileName),
      pluginCtx
    );
    const configOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDir, Bicep.ConfigFileName),
      pluginCtx
    );
    const configModule = await generateBicepFromFile(
      path.join(bicepTemplateDir, PathInfo.ConfigurationModuleTemplateFileName),
      pluginCtx
    );
    const result: v3.BicepTemplate = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { bot: provisionModules },
      },
      Configuration: {
        Orchestration: configOrchestration,
        Modules: { bot: configModule },
      },
      Reference: {
        resourceId: BotBicep.resourceId,
        hostName: BotBicep.hostName,
        webAppEndpoint: BotBicep.webAppEndpoint,
      },
      Parameters: JSON.parse(
        await fs.readFile(
          path.join(bicepTemplateDir, Bicep.ParameterFileName),
          ConstantString.UTF8Encoding
        )
      ),
    };
    return ok([result]);
  }

  async getQuestionsForAddInstance(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const capabilitiesQuestion: MultiSelectQuestion = {
      name: AzureSolutionQuestionNames.Capabilities,
      title: "Select capabilities",
      type: "multiSelect",
      staticOptions: [BotOptionItem, MessageExtensionItem],
      default: [BotOptionItem.id],
      placeholder: "Select at least 1 capability",
      validation: {
        minItems: 1,
      },
    };
    return ok(new QTreeNode(capabilitiesQuestion));
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async addInstance(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<string[], FxError>> {
    ensureSolutionSettings(ctx.projectSetting);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const capabilities = solutionSettings.capabilities;
    const newCapabilitySet = new Set<string>();
    capabilities.forEach((c: string) => newCapabilitySet.add(c));
    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
    const capabilitiesToAddManifest: v3.ManifestCapability[] = [];
    const capabilitiesAnswer = inputs[AzureSolutionQuestionNames.Capabilities] as string[];
    if (capabilitiesAnswer.includes(BotOptionItem.id)) {
      capabilitiesToAddManifest.push({ name: "Bot" });
      newCapabilitySet.add(BotOptionItem.id);
    }
    if (capabilitiesAnswer.includes(MessageExtensionItem.id)) {
      capabilitiesToAddManifest.push({ name: "MessageExtension" });
      newCapabilitySet.add(MessageExtensionItem.id);
    }
    const update = await ctx.appManifestProvider.addCapabilities(
      ctx,
      inputs,
      capabilitiesToAddManifest
    );
    if (update.isErr()) return err(update.error);

    solutionSettings.capabilities = Array.from(newCapabilitySet);
    if (!activeResourcePlugins.includes(this.name)) activeResourcePlugins.push(this.name);
    return ok([BuiltInFeaturePluginNames.identity]);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async updateBicep(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.UpdateInputs
  ): Promise<Result<v3.BicepTemplate[], FxError>> {
    const pluginCtx = { plugins: inputs.allPluginsAfterAdd };
    const bicepTemplateDir = path.join(getTemplatesFolder(), PathInfo.BicepTemplateRelativeDir);
    const configModule = await generateBicepFromFile(
      path.join(bicepTemplateDir, PathInfo.ConfigurationModuleTemplateFileName),
      pluginCtx
    );
    const result: v3.BicepTemplate = {
      Reference: {
        resourceId: BotBicep.resourceId,
        hostName: BotBicep.hostName,
        webAppEndpoint: BotBicep.webAppEndpoint,
      },
      Configuration: {
        Modules: { bot: configModule },
      },
    };
    return ok([result]);
  }
  private async getAzureAccountCredential(
    tokenProvider: AzureAccountProvider
  ): Promise<TokenCredentialsBase> {
    const serviceClientCredentials = await tokenProvider.getAccountCredentialAsync();
    if (!serviceClientCredentials) {
      throw new PreconditionError(Messages.FailToGetAzureCreds, [Messages.TryLoginAzure]);
    }
    return serviceClientCredentials;
  }

  private async createOrGetBotAppRegistration(
    ctx: v2.Context,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    const graphTokenRes = await tokenProvider.m365TokenProvider.getAccessToken({
      scopes: GraphScopes,
    });
    const token = graphTokenRes.isOk() ? graphTokenRes.value : undefined;
    CheckThrowSomethingMissing(ConfigNames.GRAPH_TOKEN, token);
    CheckThrowSomethingMissing(CommonStrings.SHORT_APP_NAME, ctx.projectSetting.appName);
    let botConfig = envInfo.state[this.name];
    if (!botConfig) botConfig = {};
    botConfig = botConfig as v3.AzureBot;
    const botAADCreated = botConfig?.botId !== undefined && botConfig?.botPassword !== undefined;
    if (!botAADCreated) {
      const solutionConfig = envInfo?.state.solution as v3.AzureSolutionConfig;
      const resourceNameSuffix = solutionConfig.resourceNameSuffix
        ? solutionConfig.resourceNameSuffix
        : utils.genUUID();
      const aadDisplayName = ResourceNameFactory.createCommonName(
        resourceNameSuffix,
        ctx.projectSetting.appName,
        MaxLengths.AAD_DISPLAY_NAME
      );
      const botAuthCreds = await AADRegistration.registerAADAppAndGetSecretByGraph(
        token!,
        aadDisplayName,
        botConfig.objectId,
        botConfig.botId
      );
      botConfig.botId = botAuthCreds.clientId;
      botConfig.botPassword = botAuthCreds.clientSecret;
      botConfig.objectId = botAuthCreds.objectId;
      ctx.logProvider.info(Messages.SuccessfullyCreatedBotAadApp);
    }

    if (envInfo.envName === "local") {
      // 2. Register bot by app studio.
      const botReg: IBotRegistration = {
        botId: botConfig.botId,
        name:
          convertToAlphanumericOnly(ctx.projectSetting.appName) +
          PluginLocalDebug.LOCAL_DEBUG_SUFFIX,
        description: "",
        iconUrl: "",
        messagingEndpoint: "",
        callingEndpoint: "",
      };
      ctx.logProvider.info(Messages.ProvisioningBotRegistration);
      const appStudioTokenRes = await tokenProvider.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;
      CheckThrowSomethingMissing(ConfigNames.APPSTUDIO_TOKEN, appStudioToken);
      await AppStudio.createBotRegistration(appStudioToken!, botReg);
      ctx.logProvider.info(Messages.SuccessfullyProvisionedBotRegistration);
    }
    return ok(Void);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async provisionResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    const botState = envInfo.state[this.name] as v3.AzureBot;
    if (!botState.secretFields) botState.secretFields = ["botPassword"];
    if (envInfo.envName === "local") {
      const handler = await ProgressBarFactory.newProgressBar(
        ProgressBarConstants.LOCAL_DEBUG_TITLE,
        ProgressBarConstants.LOCAL_DEBUG_STEPS_NUM,
        ctx
      );

      await handler?.start(ProgressBarConstants.LOCAL_DEBUG_STEP_START);

      await handler?.next(ProgressBarConstants.LOCAL_DEBUG_STEP_BOT_REG);
      await this.createOrGetBotAppRegistration(ctx, envInfo, tokenProvider);
      await handler?.end(true);
    } else {
      ctx.logProvider.info(Messages.ProvisioningBot);
      // Create and register progress bar for cleanup.
      const handler = await ProgressBarFactory.newProgressBar(
        ProgressBarConstants.PROVISION_TITLE,
        1,
        ctx
      );
      await handler?.start(ProgressBarConstants.PROVISION_STEP_START);

      // 0. Check Resource Provider
      const azureCredential = await this.getAzureAccountCredential(
        tokenProvider.azureAccountProvider
      );
      const solutionConfig = envInfo.state.solution as v3.AzureSolutionConfig;
      const rpClient = factory.createResourceProviderClient(
        azureCredential,
        solutionConfig.subscriptionId!
      );
      await factory.ensureResourceProvider(rpClient, AzureConstants.requiredResourceProviders);

      // 1. Do bot registration.
      await handler?.next(ProgressBarConstants.PROVISION_STEP_BOT_REG);
      await this.createOrGetBotAppRegistration(ctx, envInfo, tokenProvider);
      await handler?.end(true);
    }
    return ok(Void);
  }

  private async updateMessageEndpointOnAppStudio(
    appName: string,
    tokenProvider: TokenProvider,
    botId: string,
    endpoint: string
  ) {
    const appStudioTokenRes = await tokenProvider.m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;
    CheckThrowSomethingMissing(ConfigNames.APPSTUDIO_TOKEN, appStudioToken);
    CheckThrowSomethingMissing(ConfigNames.LOCAL_BOT_ID, botId);

    const botReg: IBotRegistration = {
      botId: botId,
      name: appName + PluginLocalDebug.LOCAL_DEBUG_SUFFIX,
      description: "",
      iconUrl: "",
      messagingEndpoint: endpoint,
      callingEndpoint: "",
    };

    await AppStudio.updateMessageEndpoint(appStudioToken!, botReg.botId!, botReg);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async configureResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    if (envInfo.envName === "local") {
      const botConfig = envInfo.state[this.name] as v3.AzureBot;
      CheckThrowSomethingMissing(ConfigNames.LOCAL_ENDPOINT, botConfig.siteEndpoint);
      await this.updateMessageEndpointOnAppStudio(
        convertToAlphanumericOnly(ctx.projectSetting.appName),
        tokenProvider,
        botConfig.botId,
        `${botConfig.siteEndpoint}${CommonStrings.MESSAGE_ENDPOINT_SUFFIX}`
      );
    }
    return ok(Void);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async deploy(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider.info(Messages.PreDeployingBot);

    // Preconditions checking.
    const workingDir = path.join(inputs.projectPath, CommonStrings.BOT_WORKING_DIR_NAME);
    if (!workingDir) {
      throw new PreconditionError(Messages.WorkingDirIsMissing, []);
    }
    const packDirExisted = await fs.pathExists(workingDir);
    if (!packDirExisted) {
      throw new PackDirectoryExistenceError();
    }

    const botConfig = envInfo.state[this.name] as v3.AzureBot;
    const programmingLanguage = this.getProgrammingLanguage(ctx);
    CheckThrowSomethingMissing(ConfigNames.SITE_ENDPOINT, botConfig.siteEndpoint);
    CheckThrowSomethingMissing(ConfigNames.PROGRAMMING_LANGUAGE, programmingLanguage);
    CheckThrowSomethingMissing(ConfigNames.BOT_SERVICE_RESOURCE_ID, botConfig.botWebAppResourceId);

    const subscriptionId = getSubscriptionIdFromResourceId(botConfig.botWebAppResourceId);
    const resourceGroup = getResourceGroupNameFromResourceId(botConfig.botWebAppResourceId);
    const siteName = getSiteNameFromResourceId(botConfig.botWebAppResourceId);

    CheckThrowSomethingMissing(ConfigNames.SUBSCRIPTION_ID, subscriptionId);
    CheckThrowSomethingMissing(ConfigNames.RESOURCE_GROUP, resourceGroup);

    ctx.logProvider.info(Messages.DeployingBot);

    const deployTimeCandidate = Date.now();
    const deployMgr = new DeployMgr(workingDir, envInfo.envName);
    await deployMgr.init();

    if (!(await deployMgr.needsToRedeploy())) {
      ctx.logProvider.debug(Messages.SkipDeployNoUpdates);
      return ok(Void);
    }

    const handler = await ProgressBarFactory.newProgressBar(
      ProgressBarConstants.DEPLOY_TITLE,
      ProgressBarConstants.DEPLOY_STEPS_NUM,
      ctx
    );

    await handler?.start(ProgressBarConstants.DEPLOY_STEP_START);

    await handler?.next(ProgressBarConstants.DEPLOY_STEP_NPM_INSTALL);
    const unPackFlag = (envInfo.config as EnvConfig).bot?.unPackFlag as string;
    await LanguageStrategy.localBuild(
      programmingLanguage,
      workingDir,
      unPackFlag === "false" ? false : true
    );

    await handler?.next(ProgressBarConstants.DEPLOY_STEP_ZIP_FOLDER);
    const zipBuffer = utils.zipAFolder(workingDir, DeployConfigs.UN_PACK_DIRS, [
      `${FolderNames.NODE_MODULES}/${FolderNames.KEYTAR}`,
    ]);

    // 2.2 Retrieve publishing credentials.
    const webSiteMgmtClient = new appService.WebSiteManagementClient(
      await this.getAzureAccountCredential(tokenProvider.azureAccountProvider),
      subscriptionId!
    );
    const listResponse = await AzureOperations.listPublishingCredentials(
      webSiteMgmtClient,
      resourceGroup!,
      siteName!
    );

    const publishingUserName = listResponse.publishingUserName ?? "";
    const publishingPassword = listResponse.publishingPassword ?? "";
    const encryptedCreds: string = utils.toBase64(`${publishingUserName}:${publishingPassword}`);

    const config = {
      headers: {
        Authorization: `Basic ${encryptedCreds}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    } as AzureUploadConfig;

    const zipDeployEndpoint: string = getZipDeployEndpoint(botConfig.siteName);
    await handler?.next(ProgressBarConstants.DEPLOY_STEP_ZIP_DEPLOY);
    const statusUrl = await AzureOperations.zipDeployPackage(zipDeployEndpoint, zipBuffer, config);
    await AzureOperations.checkDeployStatus(statusUrl, config);

    await deployMgr.updateLastDeployTime(deployTimeCandidate);

    await handler?.end(true);
    ctx.logProvider.info(Messages.SuccessfullyDeployedBot);

    return ok(Void);
  }
}
