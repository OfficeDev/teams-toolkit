// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext, Result, Stage, QTreeNode, NodeType, FxError, ReadonlyPluginConfig } from "fx-api";

import * as aadReg from "./aadRegistration";
import * as factory from "./clientFactory";
import * as utils from "./utils/common";
import { createQuestions } from "./questions";
import { LanguageStrategy } from "./languageStrategy";
import { Messages } from "./resources/messages";
import { FxResult, FxBotPluginResultFactory as ResultFactory } from "./result";
import { ProgressBarConstants, DeployConfigs, FolderNames, QuestionNames, WebAppConstants, LifecycleFuncNames, TemplateProjectsConstants, AuthEnvNames, AuthValues } from "./constants";
import { WayToRegisterBot } from "./enums/wayToRegisterBot";
import { getZipDeployEndpoint } from "./utils/zipDeploy";

import * as appService from "@azure/arm-appservice";
import * as fs from "fs-extra";
import { CommonStrings, PluginBot, ConfigNames, TelemetryStrings, PluginSolution } from "./resources/strings";
import { DialogUtils } from "./utils/dialog";
import { CheckThrowSomethingMissing, ConfigUpdatingError, DeployWithoutProvisionError, ListPublishingCredentialsError, MessageEndpointUpdatingError, PackDirExistenceError, PreconditionError, ProvisionError, SomethingMissingError, UserInputsError, ValidationError, ZipDeployError } from "./errors";
import { TeamsBotConfig } from "./configs/teamsBotConfig";
import { default as axios } from "axios";
import AdmZip from "adm-zip";
import { ProgressBarFactory } from "./progressBars";
import { PluginActRoles } from "./enums/pluginActRoles";
import { ResourceNameFactory } from "./utils/resourceNameFactory";
import * as AppStudio from "./appStudio/appStudio";
import { IBotRegistration } from "./appStudio/interfaces/IBotRegistration";
import { Logger } from "./logger";
import { Retry } from "./constants";
import { DeployMgr } from "./deployMgr";
import { BotAuthCredential } from "./botAuthCredential";

export class TeamsBotImpl {
    // Made config plubic, because expect the upper layer to fill inputs.
    public config: TeamsBotConfig = new TeamsBotConfig();
    private ctx?: PluginContext;

    public async getQuestions(stage: Stage, ctx: PluginContext): Promise<Result<QTreeNode | undefined, FxError>> {
        switch (stage) {
            case Stage.create: {
                return ResultFactory.Success(createQuestions);
            }
        }

        return ResultFactory.Success(new QTreeNode({
            type: NodeType.group
        }));
    }

    public async preScaffold(context: PluginContext): Promise<FxResult> {

        await this.config.restoreConfigFromContext(context);
        this.ctx = context;
        this.telemetryStepIn(LifecycleFuncNames.PRE_SCAFFOLD);
        this.markEnter(LifecycleFuncNames.PRE_SCAFFOLD);

        const rawWay = this.ctx.answers?.get(QuestionNames.WAY_TO_REGISTER_BOT);

        if (!rawWay) {
            throw new UserInputsError(QuestionNames.WAY_TO_REGISTER_BOT, rawWay as string);
        }

        const pickedWay: WayToRegisterBot = rawWay as WayToRegisterBot;

        let botRegistration = {
            botId: "",
            botPassword: "",
        };

        if (pickedWay === WayToRegisterBot.ReuseExisting) {

            botRegistration = await this.reuseExistingBotRegistration();

            this.config.scaffold.botId = botRegistration.botId;
            this.config.scaffold.botPassword = botRegistration.botPassword;

            this.config.localDebug.localBotId = botRegistration.botId;
            this.config.localDebug.localBotPassword = botRegistration.botPassword;

            this.updateManifest(this.config.scaffold.botId);
        }

        this.config.scaffold.wayToRegisterBot = pickedWay;

        this.config.saveConfigIntoContext(context);

        this.telemetryStepOutSuccess(LifecycleFuncNames.PRE_SCAFFOLD);

        return ResultFactory.Success();
    }

    public async scaffold(context: PluginContext): Promise<FxResult> {

        this.ctx = context;

        const handler = await ProgressBarFactory.newProgressBar(ProgressBarConstants.SCAFFOLD_TITLE, ProgressBarConstants.SCAFFOLD_STEPS_NUM, this.ctx);
        await handler?.start(ProgressBarConstants.SCAFFOLD_STEP_START);

        this.telemetryStepIn(LifecycleFuncNames.SCAFFOLD);

        this.markEnter(LifecycleFuncNames.SCAFFOLD);

        await this.config.restoreConfigFromContext(context);

        // 1. Copy the corresponding template project into target directory.

        // Get group name.
        let group_name = TemplateProjectsConstants.GROUP_NAME_BOT;
        if (!this.config.actRoles || this.config.actRoles.length === 0) {
            throw new SomethingMissingError("act roles");
        }

        const hasBot = this.config.actRoles.includes(PluginActRoles.Bot);
        const hasMsgExt = this.config.actRoles.includes(PluginActRoles.MessageExtension);
        if (hasBot && hasMsgExt) {
            group_name = TemplateProjectsConstants.GROUP_NAME_BOT_MSGEXT;
        } else if (hasBot) {
            group_name = TemplateProjectsConstants.GROUP_NAME_BOT;
        } else {
            group_name = TemplateProjectsConstants.GROUP_NAME_MSGEXT;
        }

        await handler?.next(ProgressBarConstants.SCAFFOLD_STEP_FETCH_ZIP);
        const zipContent: AdmZip = await LanguageStrategy.getTemplateProjectZip(this.config.scaffold.programmingLanguage!, group_name);

        await handler?.next(ProgressBarConstants.SCAFFOLD_STEP_UNZIP);
        zipContent.extractAllTo(this.config.scaffold.workingDir!, true);

        this.config.saveConfigIntoContext(context);

        this.telemetryStepOutSuccess(LifecycleFuncNames.SCAFFOLD);

        return ResultFactory.Success();
    }

    public async preProvision(context: PluginContext): Promise<FxResult> {

        await this.config.restoreConfigFromContext(context);
        this.ctx = context;
        this.telemetryStepIn(LifecycleFuncNames.PRE_PROVISION);
        this.markEnter(LifecycleFuncNames.PRE_PROVISION);

        // Preconditions checking.
        CheckThrowSomethingMissing(ConfigNames.PROGRAMMING_LANGUAGE, this.config.scaffold.programmingLanguage);
        // CheckThrowSomethingMissing(ConfigNames.GRAPH_TOKEN, this.config.scaffold.graphToken);
        CheckThrowSomethingMissing(ConfigNames.SUBSCRIPTION_ID, this.config.provision.subscriptionId);
        CheckThrowSomethingMissing(ConfigNames.RESOURCE_GROUP, this.config.provision.resourceGroup);
        CheckThrowSomethingMissing(ConfigNames.LOCATION, this.config.provision.location);

        this.config.provision.siteName = ResourceNameFactory.createCommonName(this.ctx?.app.name.short);
        Logger.debug(`Site name generated to use is ${this.config.provision.siteName}.`);

        this.config.saveConfigIntoContext(context);

        this.telemetryStepOutSuccess(LifecycleFuncNames.PRE_PROVISION);

        return ResultFactory.Success();
    }

    public async provision(context: PluginContext): Promise<FxResult> {

        await this.config.restoreConfigFromContext(context);
        this.ctx = context;
        this.telemetryStepIn(LifecycleFuncNames.PROVISION);
        this.markEnter(LifecycleFuncNames.PROVISION);

        // Create and register progress bar for cleanup.
        const handler = await ProgressBarFactory.newProgressBar(ProgressBarConstants.PROVISION_TITLE, ProgressBarConstants.PROVISION_STEPS_NUM, this.ctx);

        await handler?.start(ProgressBarConstants.PROVISION_STEP_START);

        // 1. Do bot registration.
        if (this.config.scaffold.wayToRegisterBot === WayToRegisterBot.CreateNew) {
            await handler?.next(ProgressBarConstants.PROVISION_STEP_BOT_REG);
            await this.createNewBotRegistrationOnAzure();
        }

        await handler?.next(ProgressBarConstants.PROVISION_STEP_WEB_APP);
        // 2. Provision azure web app for hosting bot project.
        await this.provisionWebApp();

        this.config.provision.provisioned = true;

        this.config.saveConfigIntoContext(context);

        this.telemetryStepOutSuccess(LifecycleFuncNames.PROVISION);

        return ResultFactory.Success();
    }

    private async provisionWebApp() {

        this.telemetryStepIn(LifecycleFuncNames.PROVISION_WEB_APP);
        this.markEnter(LifecycleFuncNames.PROVISION_WEB_APP);

        const serviceClientCredentials = await this.ctx?.azureAccountProvider?.getAccountCredentialAsync();
        if (!serviceClientCredentials) {
            throw new PreconditionError(Messages.FAIL_TO_GET_AZURE_CREDS, [Messages.TRY_LOGIN_AZURE]);
        }

        // Suppose we get creds and subs from context.
        const webSiteMgmtClient = factory.createWebSiteMgmtClient(
            serviceClientCredentials,
            this.config.provision.subscriptionId!,
        );

        // 1. Provsion app service plan.
        const appServicePlan: appService.WebSiteManagementModels.AppServicePlan = {
            location: this.config.provision.location!,
            kind: "app",
            sku: {
                name: "F1",
                tier: "Free",
                size: "F1",
            },
        };

        const appServicePlanName = this.config.provision.appServicePlan ? this.config.provision.appServicePlan : ResourceNameFactory.createCommonName(this.ctx?.app.name.short);

        let planResponse = undefined;
        try {
            planResponse = await webSiteMgmtClient.appServicePlans.createOrUpdate(
                this.config.provision.resourceGroup!,
                appServicePlanName,
                appServicePlan,
            );
        } catch (e) {
            throw new ProvisionError(CommonStrings.APP_SERVICE_PLAN, e);
        }

        this.logRestResponse(planResponse);

        if (!planResponse || !utils.isHttpCodeOkOrCreated(planResponse._response.status)) {
            throw new ProvisionError(CommonStrings.APP_SERVICE_PLAN);
        }

        // 2. Provision web app.

        const siteEnvelope: appService.WebSiteManagementModels.Site = LanguageStrategy.getSiteEnvelope(
            this.config.scaffold.programmingLanguage!,
            appServicePlanName,
            this.config.provision.location!
        );

        let webappResponse = undefined;
        try {
            webappResponse = await webSiteMgmtClient.webApps.createOrUpdate(
                this.config.provision.resourceGroup!,
                this.config.provision.siteName!,
                siteEnvelope,
            );
        } catch (e) {
            throw new ProvisionError(CommonStrings.AZURE_WEB_APP, e);
        }

        this.logRestResponse(webappResponse);

        if (!webappResponse || !utils.isHttpCodeOkOrCreated(webappResponse._response.status)) {
            throw new ProvisionError(CommonStrings.AZURE_WEB_APP);
        }

        if (!this.config.provision.siteEndpoint) {
            this.config.provision.siteEndpoint = `${CommonStrings.HTTPS_PREFIX}${webappResponse.defaultHostName}`;
        }

        if (!this.config.provision.redirectUri) {
            this.config.provision.redirectUri = `${this.config.provision.siteEndpoint}${CommonStrings.AUTH_REDIRECT_URI_SUFFIX}`;
        }

        if (!this.config.provision.appServicePlan) {
            this.config.provision.appServicePlan = appServicePlanName;
        }

        // Update config for manifest.json
        this.ctx!.config.set(PluginBot.VALID_DOMAIN, `${this.config.provision.siteName}.${WebAppConstants.WEB_APP_SITE_DOMAIN}`);

        this.telemetryStepOutSuccess(LifecycleFuncNames.PROVISION_WEB_APP);
    }

    public async postProvision(context: PluginContext): Promise<FxResult> {

        await this.config.restoreConfigFromContext(context);
        this.ctx = context;
        this.telemetryStepIn(LifecycleFuncNames.POST_PROVISION);
        this.markEnter(LifecycleFuncNames.POST_PROVISION);

        // 1. Get required config items from other plugins.
        // 2. Update bot hosting env"s app settings.
        const botId = this.config.scaffold.botId;
        const botPassword = this.config.scaffold.botPassword;
        const teamsAppClientId = this.config.teamsAppClientId;
        const teamsAppClientSecret = this.config.teamsAppClientSecret;
        const teamsAppTenant = this.config.teamsAppTenant;
        const applicationIdUris = this.config.applicationIdUris;
        const siteEndpoint = this.config.provision.siteEndpoint;

        CheckThrowSomethingMissing(ConfigNames.BOT_ID, botId);
        CheckThrowSomethingMissing(ConfigNames.BOT_PASSWORD, botPassword);
        CheckThrowSomethingMissing(ConfigNames.AUTH_CLIENT_ID, teamsAppClientId);
        CheckThrowSomethingMissing(ConfigNames.AUTH_CLIENT_SECRET, teamsAppClientSecret);
        CheckThrowSomethingMissing(ConfigNames.AUTH_TENANT, teamsAppTenant);
        CheckThrowSomethingMissing(ConfigNames.AUTH_APPLICATION_ID_URIS, applicationIdUris);
        CheckThrowSomethingMissing(ConfigNames.SITE_ENDPOINT, siteEndpoint);

        const serviceClientCredentials = await this.ctx?.azureAccountProvider?.getAccountCredentialAsync();
        if (!serviceClientCredentials) {
            throw new PreconditionError(Messages.FAIL_TO_GET_AZURE_CREDS, [Messages.TRY_LOGIN_AZURE]);
        }

        const webSiteMgmtClient = factory.createWebSiteMgmtClient(
            serviceClientCredentials,
            this.config.provision.subscriptionId!,
        );

        const appSettings = [
            { name: AuthEnvNames.BOT_ID, value: botId },
            { name: AuthEnvNames.BOT_PASSWORD, value: botPassword },
            { name: AuthEnvNames.M365_CLIENT_ID, value: teamsAppClientId },
            { name: AuthEnvNames.M365_CLIENT_SECRET, value: teamsAppClientSecret },
            { name: AuthEnvNames.M365_TENANT_ID, value: teamsAppTenant },
            { name: AuthEnvNames.M365_AUTHORITY_HOST, value: AuthValues.M365_AUTHORITY_HOST },
            { name: AuthEnvNames.INITIATE_LOGIN_ENDPOINT, value: `${this.config.provision.siteEndpoint}${CommonStrings.AUTH_LOGIN_URI_SUFFIX}` },
            { name: AuthEnvNames.M365_APPLICATION_ID_URI, value: applicationIdUris }
        ];

        if (this.config.provision.sqlEndpoint) {
            appSettings.push({ name: AuthEnvNames.SQL_ENDPOINT, value: this.config.provision.sqlEndpoint });
        }
        if (this.config.provision.sqlDatabaseName) {
            appSettings.push({ name: AuthEnvNames.SQL_DATABASE_NAME, value: this.config.provision.sqlDatabaseName });
        }
        if (this.config.provision.sqlUserName) {
            appSettings.push({ name: AuthEnvNames.SQL_USER_NAME, value: this.config.provision.sqlUserName });
        }
        if (this.config.provision.sqlPassword) {
            appSettings.push({ name: AuthEnvNames.SQL_PASSWORD, value: this.config.provision.sqlPassword });
        }
        if (this.config.provision.identityId) {
            appSettings.push({ name: AuthEnvNames.IDENTITY_ID, value: this.config.provision.identityId });
        }
        if (this.config.provision.functionEndpoint) {
            appSettings.push({ name: AuthEnvNames.API_ENDPOINT, value: this.config.provision.functionEndpoint });
        }

        const siteEnvelope: appService.WebSiteManagementModels.Site = LanguageStrategy.getSiteEnvelope(
            this.config.scaffold.programmingLanguage!,
            this.config.provision.appServicePlan!,
            this.config.provision.location!,
            appSettings
        );

        let res = undefined;

        try {
            res = await webSiteMgmtClient.webApps.createOrUpdate(
                this.config.provision.resourceGroup!,
                this.config.provision.siteName!,
                siteEnvelope,
            );
        } catch (e) {
            throw new ConfigUpdatingError(ConfigNames.AZURE_WEB_APP_AUTH_CONFIGS, e);
        }

        this.logRestResponse(res);

        if (!res || !utils.isHttpCodeOkOrCreated(res._response.status)) {
            throw new ConfigUpdatingError(ConfigNames.AZURE_WEB_APP_AUTH_CONFIGS);
        }

        // 3. Update message endpoint for bot registration.
        switch (this.config.scaffold.wayToRegisterBot) {
            case WayToRegisterBot.CreateNew: {
                await this.updateMessageEndpointOnAzure(`${this.config.provision.siteEndpoint}${CommonStrings.MESSAGE_ENDPOINT_SUFFIX}`);
                break;
            }
            case WayToRegisterBot.ReuseExisting: {
                // Remind end developers to update message endpoint manually.
                await DialogUtils.show(
                    context,
                    `Please update bot's message endpoint manually using ${this.config.provision.siteEndpoint}${CommonStrings.MESSAGE_ENDPOINT_SUFFIX} before you run this bot.`,
                );
                break;
            }
        }

        this.config.saveConfigIntoContext(context);
        this.telemetryStepOutSuccess(LifecycleFuncNames.POST_PROVISION);

        return ResultFactory.Success();
    }

    public async preDeploy(context: PluginContext): Promise<FxResult> {

        await this.config.restoreConfigFromContext(context);
        this.ctx = context;
        this.telemetryStepIn(LifecycleFuncNames.PRE_DEPLOY);
        this.markEnter(LifecycleFuncNames.PRE_DEPLOY);

        if (!this.config.provision.provisioned) {
            throw new DeployWithoutProvisionError();
        }

        // Preconditions checking.
        const packDir = this.config.scaffold.workingDir!;

        const packDirExisted = await fs.pathExists(packDir);
        if (!packDirExisted) {
            throw new PackDirExistenceError();
        }

        CheckThrowSomethingMissing(ConfigNames.SITE_ENDPOINT, this.config.provision.siteEndpoint);
        CheckThrowSomethingMissing(ConfigNames.PROGRAMMING_LANGUAGE, this.config.scaffold.programmingLanguage);
        CheckThrowSomethingMissing(ConfigNames.SUBSCRIPTION_ID, this.config.provision.subscriptionId);
        CheckThrowSomethingMissing(ConfigNames.RESOURCE_GROUP, this.config.provision.resourceGroup);

        if (!utils.isDomainValidForAzureWebApp(this.config.provision.siteEndpoint!)) {
            throw new ValidationError("siteEndpoint", this.config.provision.siteEndpoint!);
        }

        this.config.saveConfigIntoContext(context);
        this.telemetryStepOutSuccess(LifecycleFuncNames.PRE_DEPLOY);

        return ResultFactory.Success();
    }

    public async deploy(context: PluginContext): Promise<FxResult> {

        await this.config.restoreConfigFromContext(context);
        this.ctx = context;
        this.telemetryStepIn(LifecycleFuncNames.DEPLOY);
        this.markEnter(LifecycleFuncNames.DEPLOY);

        if (!this.config.scaffold.workingDir) {
            throw new PreconditionError(Messages.WORKING_DIR_IS_MISSING, []);
        }

        const deployTimeCandidate = Date.now();
        const deployMgr = new DeployMgr(this.config.scaffold.workingDir);
        await deployMgr.init();
        const needsRedeploy = await deployMgr.needsToRedeploy();
        if (!needsRedeploy) {
            Logger.debug(Messages.SKIP_DEPLOY_NO_UPDATES);
            return ResultFactory.Success();
        }

        const handler = await ProgressBarFactory.newProgressBar(ProgressBarConstants.DEPLOY_TITLE, ProgressBarConstants.DEPLOY_STEPS_NUM, this.ctx);

        await handler?.start(ProgressBarConstants.DEPLOY_STEP_START);

        const packDir = this.config.scaffold.workingDir;

        await handler?.next(ProgressBarConstants.DEPLOY_STEP_NPM_INSTALL);

        await LanguageStrategy.localBuild(this.config.scaffold.programmingLanguage!, packDir, this.config.deploy.unPackFlag === "true" ? true : false);

        await handler?.next(ProgressBarConstants.DEPLOY_STEP_ZIP_FOLDER);
        const zipBuffer = utils.zipAFolder(packDir, DeployConfigs.UN_PACK_DIRS, [`${FolderNames.NODE_MODULES}/${FolderNames.KEYTAR}`]);

        // 2.2 Retrieve publishing credentials.
        let publishingUserName = "";
        let publishingPassword: string | undefined = undefined;

        const serviceClientCredentials = await this.ctx?.azureAccountProvider?.getAccountCredentialAsync();
        if (!serviceClientCredentials) {
            throw new PreconditionError(Messages.FAIL_TO_GET_AZURE_CREDS, [Messages.TRY_LOGIN_AZURE]);
        }

        const webSiteMgmtClient = new appService.WebSiteManagementClient(
            serviceClientCredentials,
            this.config.provision.subscriptionId!,
        );

        let listResponse = undefined;
        try {
            listResponse = await webSiteMgmtClient.webApps.listPublishingCredentials(
                this.config.provision.resourceGroup!,
                this.config.provision.siteName!,
            );
        } catch (e) {
            throw new ListPublishingCredentialsError(e);
        }

        this.logRestResponse(listResponse);

        if (!listResponse || !utils.isHttpCodeOkOrCreated(listResponse._response.status)) {
            throw new ListPublishingCredentialsError();
        }

        publishingUserName = listResponse.publishingUserName;
        publishingPassword = listResponse.publishingPassword;

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

        let res = undefined;
        try {
            res = await axios.post(zipDeployEndpoint, zipBuffer, config);
        } catch (e) {
            throw new ZipDeployError(e);
        }

        this.logRestResponse(res);

        if (!res || !utils.isHttpCodeOkOrCreated(res.status)) {
            throw new ZipDeployError();
        }

        await deployMgr.updateLastDeployTime(deployTimeCandidate);
        this.config.saveConfigIntoContext(context);
        this.telemetryStepOutSuccess(LifecycleFuncNames.DEPLOY);

        return ResultFactory.Success();
    }

    public async localDebug(context: PluginContext): Promise<FxResult> {

        await this.config.restoreConfigFromContext(context);
        this.ctx = context;
        this.telemetryStepIn(LifecycleFuncNames.LOCAL_DEBUG);
        this.markEnter(LifecycleFuncNames.LOCAL_DEBUG);

        const handler = await ProgressBarFactory.newProgressBar(ProgressBarConstants.LOCAL_DEBUG_TITLE, ProgressBarConstants.LOCAL_DEBUG_STEPS_NUM, this.ctx);

        await handler?.start(ProgressBarConstants.LOCAL_DEBUG_STEP_START);

        if (this.config.scaffold.wayToRegisterBot === WayToRegisterBot.CreateNew) {
            await handler?.next(ProgressBarConstants.LOCAL_DEBUG_STEP_BOT_REG);
            await this.createNewBotRegistrationOnAppStudio();
        }

        this.config.saveConfigIntoContext(context);
        this.telemetryStepOutSuccess(LifecycleFuncNames.LOCAL_DEBUG);

        return ResultFactory.Success();
    }

    public async postLocalDebug(context: PluginContext): Promise<FxResult> {

        await this.config.restoreConfigFromContext(context);
        this.ctx = context;
        this.telemetryStepIn(LifecycleFuncNames.POST_LOCAL_DEBUG);
        this.markEnter(LifecycleFuncNames.POST_LOCAL_DEBUG);

        CheckThrowSomethingMissing(ConfigNames.LOCAL_ENDPOINT, this.config.localDebug.localEndpoint);

        switch (this.config.scaffold.wayToRegisterBot) {
            case WayToRegisterBot.CreateNew: {
                await this.updateMessageEndpointOnAppStudio(`${this.config.localDebug.localEndpoint}${CommonStrings.MESSAGE_ENDPOINT_SUFFIX}`);
                break;
            }
            case WayToRegisterBot.ReuseExisting: {
                // Remind end developers to update message endpoint manually.
                await DialogUtils.show(
                    context,
                    `Please update bot's message endpoint manually using ${this.config.localDebug.localEndpoint}${CommonStrings.MESSAGE_ENDPOINT_SUFFIX} before you run this bot.`,
                );
                break;
            }
        }

        this.config.saveConfigIntoContext(context);
        this.telemetryStepOutSuccess(LifecycleFuncNames.POST_LOCAL_DEBUG);

        return ResultFactory.Success();
    }

    private async updateMessageEndpointOnAppStudio(endpoint: string) {
        this.telemetryStepIn(LifecycleFuncNames.UPDATE_MESSAGE_ENDPOINT_APPSTUDIO);

        this.markEnter(LifecycleFuncNames.UPDATE_MESSAGE_ENDPOINT_APPSTUDIO, endpoint);

        const appStudioToken = await this.ctx?.appStudioToken?.getAccessToken();
        CheckThrowSomethingMissing(ConfigNames.APPSTUDIO_TOKEN, appStudioToken);
        CheckThrowSomethingMissing(ConfigNames.LOCAL_BOT_ID, this.config.localDebug.localBotId);

        const botReg: IBotRegistration = {
            botId: this.config.localDebug.localBotId,
            name: this.ctx!.app.name.short,
            description: "",
            iconUrl: "",
            messagingEndpoint: endpoint,
            callingEndpoint: ""
        };

        await AppStudio.updateMessageEndpoint(appStudioToken!, botReg.botId!, botReg);

        this.telemetryStepOutSuccess(LifecycleFuncNames.UPDATE_MESSAGE_ENDPOINT_APPSTUDIO);
    }

    private async updateMessageEndpointOnAzure(endpoint: string) {
        this.telemetryStepIn(LifecycleFuncNames.UPDATE_MESSAGE_ENDPOINT_AZURE);

        this.markEnter(LifecycleFuncNames.UPDATE_MESSAGE_ENDPOINT_AZURE, endpoint);

        const serviceClientCredentials = await this.ctx?.azureAccountProvider?.getAccountCredentialAsync();
        if (!serviceClientCredentials) {
            throw new PreconditionError(Messages.FAIL_TO_GET_AZURE_CREDS, [Messages.TRY_LOGIN_AZURE]);
        }

        const botClient = factory.createAzureBotServiceClient(
            serviceClientCredentials,
            this.config.provision.subscriptionId!,
        );

        if (!this.config.provision.botChannelRegName) {
            throw new SomethingMissingError(CommonStrings.BOT_CHANNEL_REGISTRATION);
        }
        const botChannelRegistrationName = this.config.provision.botChannelRegName;

        let botResponse = undefined;
        try {
            botResponse = await botClient.bots.update(
                this.config.provision.resourceGroup!,
                botChannelRegistrationName,
                {
                    properties: {
                        displayName: botChannelRegistrationName,
                        endpoint: endpoint,
                        msaAppId: this.config.scaffold.botId!,
                    },
                },
            );
        } catch (e) {
            throw new MessageEndpointUpdatingError(endpoint, e);
        }

        this.logRestResponse(botResponse);

        if (!botResponse || !utils.isHttpCodeOkOrCreated(botResponse._response.status)) {
            throw new MessageEndpointUpdatingError(endpoint);
        }

        this.telemetryStepOutSuccess(LifecycleFuncNames.UPDATE_MESSAGE_ENDPOINT_AZURE);
    }

    private async reuseExistingBotRegistration() {
        this.telemetryStepIn(LifecycleFuncNames.REUSE_EXISTING_BOT_REG);

        this.markEnter(LifecycleFuncNames.REUSE_EXISTING_BOT_REG);

        const rawBotId = this.ctx!.answers?.get(QuestionNames.GET_BOT_ID);
        if (!rawBotId) {
            throw new UserInputsError(QuestionNames.GET_BOT_ID, rawBotId as string);
        }
        const botId = rawBotId as string;

        const rawBotPassword = this.ctx!.answers?.get(QuestionNames.GET_BOT_PASSWORD);
        if (!rawBotPassword) {
            throw new UserInputsError(QuestionNames.GET_BOT_PASSWORD, rawBotPassword as string);
        }
        const botPassword = rawBotPassword as string;

        this.telemetryStepOutSuccess(LifecycleFuncNames.REUSE_EXISTING_BOT_REG);

        return {
            botId: botId,
            botPassword: botPassword,
        };
    }

    private async createNewBotRegistrationOnAppStudio() {
        this.telemetryStepIn(LifecycleFuncNames.CREATE_NEW_BOT_REG_APPSTUDIO);
        this.markEnter(LifecycleFuncNames.CREATE_NEW_BOT_REG_APPSTUDIO);
        Logger.debug("Start to create new bot registration on app studio.");

        const appStudioToken = await this.ctx?.appStudioToken?.getAccessToken();
        CheckThrowSomethingMissing(ConfigNames.APPSTUDIO_TOKEN, appStudioToken);

        if (this.config.localDebug.botRegistrationCreated() && (await AppStudio.isAADAppExisting(appStudioToken!, this.config.localDebug.localObjectId!))) {
            Logger.debug("Local bot has already been registered, just return.");
            return;
        }

        // 1. Create a new AAD App Registraion with client secret.
        const aadDisplayName = ResourceNameFactory.createCommonName(this.ctx?.app.name.short);

        const botAuthCreds = await aadReg.registerAADAppAndGetSecretByAppStudio(
            appStudioToken!,
            aadDisplayName
        );

        // 2. Register bot by app studio.
        const botReg: IBotRegistration = {
            botId: botAuthCreds.clientId,
            name: this.ctx!.app.name.short,
            description: "",
            iconUrl: "",
            messagingEndpoint: "",
            callingEndpoint: ""
        };

        Logger.debug(`Start to create bot registration by ${JSON.stringify(botReg)}`);

        await AppStudio.createBotRegistration(appStudioToken!, botReg);

        if (!this.config.localDebug.localBotId) {
            this.config.localDebug.localBotId = botAuthCreds.clientId;
        }

        if (!this.config.localDebug.localBotPassword) {
            this.config.localDebug.localBotPassword = botAuthCreds.clientSecret;
        }

        if (!this.config.localDebug.localObjectId) {
            this.config.localDebug.localObjectId = botAuthCreds.objectId;
        }

        this.updateManifest(this.config.localDebug.localBotId!);

        this.telemetryStepOutSuccess(LifecycleFuncNames.CREATE_NEW_BOT_REG_APPSTUDIO);
    }

    private async createNewBotRegistrationOnAzure() {

        this.telemetryStepIn(LifecycleFuncNames.CREATE_NEW_BOT_REG_AZURE);
        this.markEnter(LifecycleFuncNames.CREATE_NEW_BOT_REG_AZURE);

        // 1. Create a new AAD App Registraion with client secret.
        const appStudioToken = await this.ctx?.appStudioToken?.getAccessToken();
        CheckThrowSomethingMissing(ConfigNames.APPSTUDIO_TOKEN, appStudioToken);

        let botAuthCreds = new BotAuthCredential();

        if (!this.config.scaffold.botRegistrationCreated()) {
            const aadDisplayName = ResourceNameFactory.createCommonName(this.ctx?.app.name.short);
            botAuthCreds = await aadReg.registerAADAppAndGetSecretByAppStudio(
                appStudioToken!,
                aadDisplayName
            );
        } else {
            botAuthCreds.clientId = this.config.scaffold.botId;
            botAuthCreds.clientSecret = this.config.scaffold.botPassword;
            botAuthCreds.objectId = this.config.scaffold.objectId;
        }

        const serviceClientCredentials = await this.ctx?.azureAccountProvider?.getAccountCredentialAsync();
        if (!serviceClientCredentials) {
            throw new PreconditionError(Messages.FAIL_TO_GET_AZURE_CREDS, [Messages.TRY_LOGIN_AZURE]);
        }

        // 2. Provision a bot channel registration resource on azure.
        const botClient = factory.createAzureBotServiceClient(
            serviceClientCredentials,
            this.config.provision.subscriptionId!,
        );

        const botChannelRegistrationName = this.config.provision.botChannelRegName ?
            this.config.provision.botChannelRegName : ResourceNameFactory.createCommonName(this.ctx?.app.name.short);

        let botResponse = undefined;
        try {
            botResponse = await botClient.bots.create(
                this.config.provision.resourceGroup!,
                botChannelRegistrationName,
                {
                    location: "global",
                    kind: "bot",
                    properties: {
                        displayName: botChannelRegistrationName,
                        endpoint: "",
                        msaAppId: botAuthCreds.clientId!,
                    },
                },
            );
        } catch (e) {
            throw new ProvisionError(CommonStrings.BOT_CHANNEL_REGISTRATION, e);
        }

        this.logRestResponse(botResponse);

        if (!botResponse || !utils.isHttpCodeOkOrCreated(botResponse._response.status)) {
            throw new ProvisionError(CommonStrings.BOT_CHANNEL_REGISTRATION);
        }

        // 3. Add Teams Client as a channel to the resource above.
        let channelResponse = undefined;

        try {
            channelResponse = await botClient.channels.create(
                this.config.provision.resourceGroup!,
                botChannelRegistrationName,
                "MsTeamsChannel",
                {
                    location: "global",
                    kind: "bot",
                    properties: {
                        channelName: "MsTeamsChannel",
                        properties: {
                            isEnabled: true,
                        },
                    },
                },
            );
        } catch (e) {
            throw new ProvisionError(CommonStrings.MS_TEAMS_CHANNEL, e);
        }

        this.logRestResponse(channelResponse);

        if (!channelResponse || !utils.isHttpCodeOkOrCreated(channelResponse._response.status)) {

            throw new ProvisionError(CommonStrings.MS_TEAMS_CHANNEL);
        }

        if (!this.config.scaffold.botId) {
            this.config.scaffold.botId = botAuthCreds.clientId;
        }

        if (!this.config.scaffold.botPassword) {
            this.config.scaffold.botPassword = botAuthCreds.clientSecret;
        }

        if (!this.config.scaffold.objectId) {
            this.config.scaffold.objectId = botAuthCreds.objectId;
        }

        if (!this.config.provision.botChannelRegName) {
            this.config.provision.botChannelRegName = botChannelRegistrationName;
        }

        this.updateManifest(this.config.scaffold.botId!);

        this.telemetryStepOutSuccess(LifecycleFuncNames.CREATE_NEW_BOT_REG_AZURE);
    }

    private updateManifest(botId: string) {

        if (this.config.actRoles.includes(PluginActRoles.Bot)) {
            this.ctx!.config.set(PluginBot.BOTS_SECTION, utils.genBotSectionInManifest(botId));
        }

        if (this.config.actRoles.includes(PluginActRoles.MessageExtension)) {
            this.ctx!.config.set(PluginBot.MESSAGE_EXTENSION_SECTION, utils.genMsgExtSectionInManifest(botId));
        }
    }

    private markEnter(funcName: string, joinedParams?: string) {
        Logger.debug(Messages.EnterFunc(funcName, joinedParams));
    }

    private logRestResponse(obj: any) {
        // ToDo: Keep the placeholder here to log some simple information from response in the future.
        return;
    }

    private telemetryStepIn(funcName: string) {
        this.ctx?.telemetryReporter?.sendTelemetryEvent(`${funcName}-start`, {
            component: PluginBot.PLUGIN_NAME,
        });
    }

    private telemetryStepOutSuccess(funcName: string) {
        this.ctx?.telemetryReporter?.sendTelemetryEvent(`${funcName}-end`, {
            component: PluginBot.PLUGIN_NAME,
            success: "yes",
        });
    }
}
