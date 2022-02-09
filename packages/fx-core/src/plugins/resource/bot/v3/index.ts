// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  AzureAccountProvider,
  AzureSolutionSettings,
  err,
  FxError,
  ok,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { Bicep, ConstantString } from "../../../../common/constants";
import {
  generateBicepFromFile,
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../../common/tools";
import { CommonErrorHandlerMW } from "../../../../core/middleware/CommonErrorHandlerMW";
import { getTemplatesFolder } from "../../../../folder";
import {
  AzureSolutionQuestionNames,
  BotOptionItem,
  MessageExtensionItem,
} from "../../../solution/fx-solution/question";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { TeamsBotConfig } from "../configs/teamsBotConfig";
import {
  AzureConstants,
  BotBicep,
  DeployConfigs,
  FolderNames,
  MaxLengths,
  PathInfo,
  ProgressBarConstants,
  TemplateProjectsConstants,
} from "../constants";
import {
  CheckThrowSomethingMissing,
  PackDirExistenceError,
  PreconditionError,
  SomethingMissingError,
} from "../errors";
import { LanguageStrategy } from "../languageStrategy";
import { ProgressBarFactory } from "../progressBars";
import { Messages } from "../resources/messages";
import fs from "fs-extra";
import { CommonStrings, ConfigNames, PluginLocalDebug } from "../resources/strings";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import * as factory from "../clientFactory";
import { BotAuthCredential } from "../botAuthCredential";
import { ResourceNameFactory } from "../utils/resourceNameFactory";
import { AADRegistration } from "../aadRegistration";
import { IBotRegistration } from "../appStudio/interfaces/IBotRegistration";
import { AppStudio } from "../appStudio/appStudio";
import { DeployMgr } from "../deployMgr";
import * as utils from "../utils/common";
import * as appService from "@azure/arm-appservice";
import { AzureOperations } from "../azureOps";
import { getZipDeployEndpoint } from "../utils/zipDeploy";

@Service(BuiltInFeaturePluginNames.bot)
export class NodeJSBotPluginV3 implements v3.FeaturePlugin {
  name = BuiltInFeaturePluginNames.bot;
  displayName = "NodeJS Bot";
  public config: TeamsBotConfig = new TeamsBotConfig();

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async scaffold(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<Void | undefined, FxError>> {
    await this.config.restoreConfigFromContextV3(ctx, inputs);
    ctx.logProvider.info(Messages.ScaffoldingBot);

    const handler = await ProgressBarFactory.newProgressBar(
      ProgressBarConstants.SCAFFOLD_TITLE,
      ProgressBarConstants.SCAFFOLD_STEPS_NUM,
      ctx
    );
    await handler?.start(ProgressBarConstants.SCAFFOLD_STEP_START);

    // 1. Copy the corresponding template project into target directory.
    // Get group name.
    const group_name = TemplateProjectsConstants.GROUP_NAME_BOT_MSGEXT;
    if (!this.config.actRoles || this.config.actRoles.length === 0) {
      throw new SomethingMissingError("act roles");
    }

    await handler?.next(ProgressBarConstants.SCAFFOLD_STEP_FETCH_ZIP);
    await LanguageStrategy.getTemplateProject(group_name, this.config);

    // this.config.saveConfigIntoContextV3(envInfo); // scaffold will not persist state in envInfo
    ctx.logProvider.info(Messages.SuccessfullyScaffoldedBot);
    return ok(undefined);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async generateResourceTemplate(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    ctx.logProvider.info(Messages.GeneratingArmTemplatesBot);
    const solutionSettings = ctx.projectSetting.solutionSettings as
      | AzureSolutionSettings
      | undefined;
    const pluginCtx = { plugins: solutionSettings ? solutionSettings.activeResourcePlugins : [] };
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
    const result: ArmTemplateResult = {
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
    ctx.logProvider.info(Messages.SuccessfullyGenerateArmTemplatesBot);
    return ok([{ kind: "bicep", template: result }]);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async addFeature(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    const scaffoldRes = await this.scaffold(ctx, inputs);
    if (scaffoldRes.isErr()) return err(scaffoldRes.error);
    const armRes = await this.generateResourceTemplate(ctx, inputs);
    if (armRes.isErr()) return err(armRes.error);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const capabilities = solutionSettings.capabilities;
    const capabilitiesAnswer = inputs[AzureSolutionQuestionNames.Capabilities] as string[];
    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
    if (capabilitiesAnswer.includes(BotOptionItem.id) && !capabilities.includes(BotOptionItem.id))
      capabilities.push(BotOptionItem.id);
    if (
      capabilitiesAnswer.includes(MessageExtensionItem.id) &&
      !capabilities.includes(MessageExtensionItem.id)
    )
      capabilities.push(MessageExtensionItem.id);
    if (!activeResourcePlugins.includes(this.name)) activeResourcePlugins.push(this.name);
    return ok(armRes.value);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async afterOtherFeaturesAdded(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.OtherFeaturesAddedInputs
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    ctx.logProvider.info(Messages.UpdatingArmTemplatesBot);
    const solutionSettings = ctx.projectSetting.solutionSettings as
      | AzureSolutionSettings
      | undefined;
    const pluginCtx = { plugins: solutionSettings ? solutionSettings.activeResourcePlugins : [] };
    const bicepTemplateDir = path.join(getTemplatesFolder(), PathInfo.BicepTemplateRelativeDir);
    const configModule = await generateBicepFromFile(
      path.join(bicepTemplateDir, PathInfo.ConfigurationModuleTemplateFileName),
      pluginCtx
    );
    const result: ArmTemplateResult = {
      Reference: {
        resourceId: BotBicep.resourceId,
        hostName: BotBicep.hostName,
        webAppEndpoint: BotBicep.webAppEndpoint,
      },
      Configuration: {
        Modules: { bot: configModule },
      },
    };
    ctx.logProvider.info(Messages.SuccessfullyUpdateArmTemplatesBot);
    return ok([{ kind: "bicep", template: result }]);
  }
  private async getAzureAccountCredenial(
    tokenProvider: AzureAccountProvider
  ): Promise<TokenCredentialsBase> {
    const serviceClientCredentials = await tokenProvider.getAccountCredentialAsync();
    if (!serviceClientCredentials) {
      throw new PreconditionError(Messages.FailToGetAzureCreds, [Messages.TryLoginAzure]);
    }
    return serviceClientCredentials;
  }
  //for remote provision
  private async createOrGetBotAppRegistration(
    ctx: v2.Context,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<BotAuthCredential> {
    const token = await tokenProvider.graphTokenProvider.getAccessToken();
    CheckThrowSomethingMissing(ConfigNames.GRAPH_TOKEN, token);
    CheckThrowSomethingMissing(CommonStrings.SHORT_APP_NAME, ctx.projectSetting.appName);

    let botAuthCreds = new BotAuthCredential();

    if (!this.config.scaffold.botAADCreated()) {
      const aadDisplayName = ResourceNameFactory.createCommonName(
        this.config.resourceNameSuffix,
        ctx.projectSetting.appName,
        MaxLengths.AAD_DISPLAY_NAME
      );
      botAuthCreds = await AADRegistration.registerAADAppAndGetSecretByGraph(
        token!,
        aadDisplayName,
        this.config.scaffold.objectId,
        this.config.scaffold.botId
      );

      this.config.scaffold.botId = botAuthCreds.clientId;
      this.config.scaffold.botPassword = botAuthCreds.clientSecret;
      this.config.scaffold.objectId = botAuthCreds.objectId;

      this.config.saveConfigIntoContextV3(envInfo); // Checkpoint for aad app provision.
      ctx.logProvider.info(Messages.SuccessfullyCreatedBotAadApp);
    } else {
      botAuthCreds.clientId = this.config.scaffold.botId;
      botAuthCreds.clientSecret = this.config.scaffold.botPassword;
      botAuthCreds.objectId = this.config.scaffold.objectId;
      ctx.logProvider.info(Messages.SuccessfullyGetExistingBotAadAppCredential);
    }
    return botAuthCreds;
  }

  //for local provision
  private async createNewBotRegistrationOnAppStudio(
    ctx: v2.Context,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ) {
    const token = await tokenProvider.graphTokenProvider.getAccessToken();
    CheckThrowSomethingMissing(ConfigNames.GRAPH_TOKEN, token);
    CheckThrowSomethingMissing(CommonStrings.SHORT_APP_NAME, ctx.projectSetting.appName);

    // 1. Create a new AAD App Registraion with client secret.
    const aadDisplayName = ResourceNameFactory.createCommonName(
      this.config.resourceNameSuffix,
      ctx.projectSetting.appName,
      MaxLengths.AAD_DISPLAY_NAME
    );

    let botAuthCreds: BotAuthCredential = new BotAuthCredential();
    if (
      this.config.localDebug.botAADCreated()
      // if user input AAD, the object id is not required
      // && (await AppStudio.isAADAppExisting(appStudioToken!, this.config.localDebug.localObjectId!))
    ) {
      botAuthCreds.clientId = this.config.localDebug.localBotId;
      botAuthCreds.clientSecret = this.config.localDebug.localBotPassword;
      botAuthCreds.objectId = this.config.localDebug.localObjectId;
      ctx.logProvider.debug(Messages.SuccessfullyGetExistingBotAadAppCredential);
    } else {
      ctx.logProvider.info(Messages.ProvisioningBotRegistration);
      botAuthCreds = await AADRegistration.registerAADAppAndGetSecretByGraph(
        token!,
        aadDisplayName,
        this.config.localDebug.localObjectId,
        this.config.localDebug.localBotId
      );
      ctx.logProvider.info(Messages.SuccessfullyProvisionedBotRegistration);
    }

    // 2. Register bot by app studio.
    const botReg: IBotRegistration = {
      botId: botAuthCreds.clientId,
      name: ctx.projectSetting.appName + PluginLocalDebug.LOCAL_DEBUG_SUFFIX,
      description: "",
      iconUrl: "",
      messagingEndpoint: "",
      callingEndpoint: "",
    };

    ctx.logProvider.info(Messages.ProvisioningBotRegistration);
    const appStudioToken = await tokenProvider.appStudioToken.getAccessToken();
    CheckThrowSomethingMissing(ConfigNames.APPSTUDIO_TOKEN, appStudioToken);
    await AppStudio.createBotRegistration(appStudioToken!, botReg);
    ctx.logProvider.info(Messages.SuccessfullyProvisionedBotRegistration);

    if (!this.config.localDebug.localBotId) {
      this.config.localDebug.localBotId = botAuthCreds.clientId;
    }

    if (!this.config.localDebug.localBotPassword) {
      this.config.localDebug.localBotPassword = botAuthCreds.clientSecret;
    }

    if (!this.config.localDebug.localObjectId) {
      this.config.localDebug.localObjectId = botAuthCreds.objectId;
    }
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async provisionResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    await this.config.restoreConfigFromContextV3(ctx, inputs, envInfo);

    if (envInfo.envName === "local") {
      const handler = await ProgressBarFactory.newProgressBar(
        ProgressBarConstants.LOCAL_DEBUG_TITLE,
        ProgressBarConstants.LOCAL_DEBUG_STEPS_NUM,
        ctx
      );

      await handler?.start(ProgressBarConstants.LOCAL_DEBUG_STEP_START);

      await handler?.next(ProgressBarConstants.LOCAL_DEBUG_STEP_BOT_REG);
      await this.createNewBotRegistrationOnAppStudio(ctx, envInfo, tokenProvider);
    } else {
      CheckThrowSomethingMissing(
        ConfigNames.PROGRAMMING_LANGUAGE,
        this.config.scaffold.programmingLanguage
      );
      ctx.logProvider.info(Messages.ProvisioningBot);

      // Create and register progress bar for cleanup.
      const handler = await ProgressBarFactory.newProgressBar(
        ProgressBarConstants.PROVISION_TITLE,
        ProgressBarConstants.PROVISION_STEPS_NUM,
        ctx
      );
      await handler?.start(ProgressBarConstants.PROVISION_STEP_START);

      // 0. Check Resource Provider
      const azureCredential = await this.getAzureAccountCredenial(
        tokenProvider.azureAccountProvider
      );
      const rpClient = factory.createResourceProviderClient(
        azureCredential,
        this.config.provision.subscriptionId!
      );
      await factory.ensureResourceProvider(rpClient, AzureConstants.requiredResourceProviders);

      // 1. Do bot registration.
      await handler?.next(ProgressBarConstants.PROVISION_STEP_BOT_REG);
      await this.createOrGetBotAppRegistration(ctx, envInfo, tokenProvider);
    }
    this.config.saveConfigIntoContextV3(envInfo);

    return ok(Void);
  }
  private async updateMessageEndpointOnAppStudio(
    appName: string,
    tokenProvider: TokenProvider,
    endpoint: string
  ) {
    const appStudioToken = await tokenProvider.appStudioToken.getAccessToken();
    CheckThrowSomethingMissing(ConfigNames.APPSTUDIO_TOKEN, appStudioToken);
    CheckThrowSomethingMissing(ConfigNames.LOCAL_BOT_ID, this.config.localDebug.localBotId);

    const botReg: IBotRegistration = {
      botId: this.config.localDebug.localBotId,
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
      await this.config.restoreConfigFromContextV3(ctx, inputs, envInfo);
      CheckThrowSomethingMissing(ConfigNames.LOCAL_ENDPOINT, this.config.localDebug.localEndpoint);
      await this.updateMessageEndpointOnAppStudio(
        ctx.projectSetting.appName,
        tokenProvider,
        `${this.config.localDebug.localEndpoint}${CommonStrings.MESSAGE_ENDPOINT_SUFFIX}`
      );
      this.config.saveConfigIntoContextV3(envInfo);
    }
    return ok(Void);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async deploy(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    await this.config.restoreConfigFromContextV3(ctx, inputs, envInfo as v3.EnvInfoV3);

    ctx.logProvider.info(Messages.PreDeployingBot);

    // Preconditions checking.
    const packDirExisted = await fs.pathExists(this.config.scaffold.workingDir!);
    if (!packDirExisted) {
      throw new PackDirExistenceError();
    }

    CheckThrowSomethingMissing(ConfigNames.SITE_ENDPOINT, this.config.provision.siteEndpoint);
    CheckThrowSomethingMissing(
      ConfigNames.PROGRAMMING_LANGUAGE,
      this.config.scaffold.programmingLanguage
    );
    CheckThrowSomethingMissing(
      ConfigNames.BOT_SERVICE_RESOURCE_ID,
      this.config.provision.botWebAppResourceId
    );
    CheckThrowSomethingMissing(ConfigNames.SUBSCRIPTION_ID, this.config.provision.subscriptionId);
    CheckThrowSomethingMissing(ConfigNames.RESOURCE_GROUP, this.config.provision.resourceGroup);

    this.config.saveConfigIntoContextV3(envInfo as v3.EnvInfoV3);

    this.config.provision.subscriptionId = getSubscriptionIdFromResourceId(
      this.config.provision.botWebAppResourceId!
    );
    this.config.provision.resourceGroup = getResourceGroupNameFromResourceId(
      this.config.provision.botWebAppResourceId!
    );
    this.config.provision.siteName = getSiteNameFromResourceId(
      this.config.provision.botWebAppResourceId!
    );

    ctx.logProvider.info(Messages.DeployingBot);

    const workingDir = this.config.scaffold.workingDir;
    if (!workingDir) {
      throw new PreconditionError(Messages.WorkingDirIsMissing, []);
    }

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
    await LanguageStrategy.localBuild(
      this.config.scaffold.programmingLanguage!,
      workingDir,
      this.config.deploy.unPackFlag === "true" ? true : false
    );

    await handler?.next(ProgressBarConstants.DEPLOY_STEP_ZIP_FOLDER);
    const zipBuffer = utils.zipAFolder(workingDir, DeployConfigs.UN_PACK_DIRS, [
      `${FolderNames.NODE_MODULES}/${FolderNames.KEYTAR}`,
    ]);

    // 2.2 Retrieve publishing credentials.
    const webSiteMgmtClient = new appService.WebSiteManagementClient(
      await this.getAzureAccountCredenial(tokenProvider),
      this.config.provision.subscriptionId!
    );
    const listResponse = await AzureOperations.ListPublishingCredentials(
      webSiteMgmtClient,
      this.config.provision.resourceGroup!,
      this.config.provision.siteName!
    );

    const publishingUserName = listResponse.publishingUserName
      ? listResponse.publishingUserName
      : "";
    const publishingPassword = listResponse.publishingPassword
      ? listResponse.publishingPassword
      : "";
    const encryptedCreds: string = utils.toBase64(`${publishingUserName}:${publishingPassword}`);

    const config = {
      headers: {
        Authorization: `Basic ${encryptedCreds}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    };

    const zipDeployEndpoint: string = getZipDeployEndpoint(this.config.provision.siteName!);
    await handler?.next(ProgressBarConstants.DEPLOY_STEP_ZIP_DEPLOY);
    await AzureOperations.ZipDeployPackage(zipDeployEndpoint, zipBuffer, config);

    await deployMgr.updateLastDeployTime(deployTimeCandidate);

    ctx.logProvider.info(Messages.SuccessfullyDeployedBot);

    return ok(Void);
  }
}
