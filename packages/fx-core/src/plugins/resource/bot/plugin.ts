// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext, Result, Stage, QTreeNode, NodeType, FxError } from "teamsfx-api";

import * as path from "path";
import * as aadReg from "./aadRegistration";
import * as factory from "./clientFactory";
import * as utils from "./utils/common";
import { createQuestions } from "./questions";
import { LanguageStrategy } from "./languageStrategy";
import { Messages } from "./resources/messages";
import { ConfigNames } from "./resources/strings";
import { FxResult, FxTeamsBotPluginResultFactory as ResultFactory } from "./result";
import { ScaffoldPlaceholders, ProgressBarConstants, QuestionNames, ContextConfigKeys, WebAppConstants, LifecycleFuncNames, TemplateProjectsConstants } from "./constants";
import { WayToRegisterBot } from "./enums/wayToRegisterBot";
import { getZipDeployEndpoint } from "./utils/zipDeploy";

import * as appService from "@azure/arm-appservice";
import * as fs from "fs-extra";
import { CommonStrings, TelemetryStrings } from "./resources/strings";
import { DialogUtils } from "./utils/dialog";
import { CheckThrowSomethingMissing, ConfigUpdatingException, ListPublishingCredentialsException, MessageEndpointUpdatingException, PackDirExistenceException, ProvisionException, SomethingMissingException, UserInputsException, ValidationException, ZipDeployException } from "./exceptions";
import { TeamsBotConfig } from "./configs/teamsBotConfig";
import { default as axios } from "axios";
import AdmZip from "adm-zip";
import { ProgrammingLanguage } from "./enums/programmingLanguage";
import { ProgressBarFactory } from "./progressBars";
import { PluginActRoles } from "./enums/pluginActRoles";
import { ResourceNameFactory } from "./utils/resourceNameFactory";

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
        this.telemetryStepIn(LifecycleFuncNames.PRE_SCAFFOLD);

        this.ctx = context;

        this.markEnterAndLogConfig(LifecycleFuncNames.PRE_SCAFFOLD);

        await this.config.restoreConfigFromContext(context);

        const rawProgrammingLanguage = this.ctx.answers?.get(QuestionNames.PROGRAMMING_LANGUAGE);

        if (!rawProgrammingLanguage) {
            throw new UserInputsException(QuestionNames.PROGRAMMING_LANGUAGE, rawProgrammingLanguage as string);
        }

        const pickedProgrammingLanguage: ProgrammingLanguage = rawProgrammingLanguage as ProgrammingLanguage;

        const rawWay = this.ctx.answers?.get(QuestionNames.WAY_TO_REGISTER_BOT);

        if (!rawWay) {
            throw new UserInputsException(QuestionNames.WAY_TO_REGISTER_BOT, rawWay as string);
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
        }

        this.config.scaffold.programmingLanguage = pickedProgrammingLanguage;
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

        this.markEnterAndLogConfig(LifecycleFuncNames.SCAFFOLD);

        await this.config.restoreConfigFromContext(context);

        if (this.config.scaffold.scaffolded) {
            this.ctx?.logProvider?.debug("Skip scaffold since scaffolded.");
            return ResultFactory.Success();
        }

        // 1. Copy the corresponding template project into target directory.
        // 2. Replace placeholders in project settings.
        // 3. Replace placeholders in .vscode/launch.json.

        // Get group name.
        let group_name = TemplateProjectsConstants.GROUP_NAME_BOT;
        if (!this.config.actRoles || this.config.actRoles.length === 0) {
            throw new SomethingMissingException("act roles");
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

        await handler?.next(ProgressBarConstants.SCAFFOLD_STEP_REPLACEMENT);
        const configFiles = LanguageStrategy.getConfigFiles(this.config.scaffold.programmingLanguage!);
        configFiles.forEach((fileName) => {

            if (!utils.pathInZipArchive(zipContent, fileName)) {
                throw new SomethingMissingException(`${fileName} inside zip`);
            }

            const entry = zipContent.getEntry(fileName);
            let entryContent = entry.getData().toString();

            if (this.config.scaffold.wayToRegisterBot === WayToRegisterBot.ReuseExisting) {
                entryContent = entryContent.replace(ScaffoldPlaceholders.BOT_ID, this.config.scaffold.botId!);
                entryContent = entryContent.replace(
                    ScaffoldPlaceholders.BOT_PASSWORD,
                    this.config.scaffold.botPassword!,
                );
            }

            entry.setData(Buffer.from(entryContent, CommonStrings.DEFAULT_FILE_ENCODING));
        });

        await handler?.next(ProgressBarConstants.SCAFFOLD_STEP_UNZIP);
        zipContent.extractAllTo(this.config.scaffold.workingDir!, true);

        this.config.scaffold.scaffolded = true;

        this.config.saveConfigIntoContext(context);

        this.telemetryStepOutSuccess(LifecycleFuncNames.SCAFFOLD);

        return ResultFactory.Success();
    }

    public async preProvision(context: PluginContext): Promise<FxResult> {

        this.ctx = context;

        this.telemetryStepIn(LifecycleFuncNames.PRE_PROVISION);

        this.markEnterAndLogConfig(LifecycleFuncNames.PRE_PROVISION);

        await this.config.restoreConfigFromContext(context);

        // Preconditions checking.
        CheckThrowSomethingMissing(ConfigNames.PROGRAMMING_LANGUAGE, this.config.scaffold.programmingLanguage);
        // CheckThrowSomethingMissing(ConfigNames.GRAPH_TOKEN, this.config.scaffold.graphToken);
        CheckThrowSomethingMissing(ConfigNames.SUBSCRIPTION_ID, this.config.provision.subscriptionId);
        CheckThrowSomethingMissing(ConfigNames.SERVICE_CLIENT_CREDENTIALS, this.config.provision.serviceClientCredentials);
        CheckThrowSomethingMissing(ConfigNames.RESOURCE_GROUP, this.config.provision.resourceGroup);
        CheckThrowSomethingMissing(ConfigNames.LOCATION, this.config.provision.location);

        this.config.provision.siteName = ResourceNameFactory.createCommonName(this.ctx?.app.name.short);
        this.ctx?.logProvider?.debug(`Site name generated to use is ${this.config.provision.siteName}.`);

        this.telemetryStepOutSuccess(LifecycleFuncNames.PRE_PROVISION);

        return ResultFactory.Success();
    }

    public async provision(context: PluginContext): Promise<FxResult> {

        this.ctx = context;

        // Create and register progress bar for cleanup.
        const handler = await ProgressBarFactory.newProgressBar(ProgressBarConstants.PROVISION_TITLE, ProgressBarConstants.PROVISION_STEPS_NUM, this.ctx);

        await handler?.start(ProgressBarConstants.PROVISION_STEP_START);

        this.telemetryStepIn(LifecycleFuncNames.PROVISION);

        this.markEnterAndLogConfig(LifecycleFuncNames.PROVISION);

        await this.config.restoreConfigFromContext(context);

        // 1. Do bot registration and replace placeholders.
        if (this.config.scaffold.wayToRegisterBot === WayToRegisterBot.CreateNew) {
            await handler?.next(ProgressBarConstants.PROVISION_STEP_BOT_REG);
            await this.createNewBotRegistration();

            await handler?.next(ProgressBarConstants.PROVISION_STEP_REPLACEMENT);
            // Replace {BOT_ID} & {BOT_PASSWORD} on disk.
            const configFiles = LanguageStrategy.getConfigFiles(this.config.scaffold.programmingLanguage!);
            configFiles.forEach((fileName) => {
                const fullFilePath: string = path.join(this.config.scaffold.workingDir!, fileName);
                let fileContent: string = fs.readFileSync(fullFilePath, CommonStrings.DEFAULT_FILE_ENCODING);

                fileContent = fileContent.replace(ScaffoldPlaceholders.BOT_ID, this.config.scaffold.botId!);
                fileContent = fileContent.replace(ScaffoldPlaceholders.BOT_PASSWORD, this.config.scaffold.botPassword!);

                fs.writeFileSync(fullFilePath, fileContent);
            });
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
        this.markEnterAndLogConfig(LifecycleFuncNames.PROVISION_WEB_APP);

        // Suppose we get creds and subs from context.
        const webSiteMgmtClient = factory.createWebSiteMgmtClient(
            this.config.provision.serviceClientCredentials!,
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

        const appServicePlanName = ResourceNameFactory.createCommonName(this.ctx?.app.name.short);

        let planResponse = undefined;
        try {
            planResponse = await webSiteMgmtClient.appServicePlans.createOrUpdate(
                this.config.provision.resourceGroup!,
                appServicePlanName,
                appServicePlan,
            );
        } catch (e) {
            throw new ProvisionException(CommonStrings.APP_SERVICE_PLAN, e);
        }

        this.logRestResponse(planResponse);

        if (!planResponse || !utils.isHttpCodeOkOrCreated(planResponse._response.status)) {
            throw new ProvisionException(CommonStrings.APP_SERVICE_PLAN);
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
            throw new ProvisionException(CommonStrings.AZURE_WEB_APP, e);
        }

        this.logRestResponse(webappResponse);

        if (!webappResponse || !utils.isHttpCodeOkOrCreated(webappResponse._response.status)) {
            throw new ProvisionException(CommonStrings.AZURE_WEB_APP);
        }

        this.config.provision.siteEndpoint = `https://${webappResponse.defaultHostName}`;

        this.config.provision.appServicePlan = appServicePlanName;

        this.telemetryStepOutSuccess(LifecycleFuncNames.PROVISION_WEB_APP);
    }

    public async postProvision(context: PluginContext): Promise<FxResult> {

        this.ctx = context;

        this.telemetryStepIn(LifecycleFuncNames.POST_PROVISION);

        this.markEnterAndLogConfig(LifecycleFuncNames.POST_PROVISION);

        // 1. Get required config items from other plugins.
        // 2. Update bot hosting env"s app settings.
        await this.config.restoreConfigFromContext(context);


        const teamsAppClientId = this.config.teamsAppClientId;
        const teamsAppClientSecret = this.config.teamsAppClientSecret;
        const teamsAppTenant = this.config.teamsAppTenant;
        const baseUrl = `https://${this.config.provision.siteEndpoint}`;

        CheckThrowSomethingMissing(ConfigNames.AUTH_CLIENT_ID, this.config.teamsAppClientId);
        CheckThrowSomethingMissing(ConfigNames.AUTH_CLIENT_SECRET, this.config.teamsAppClientSecret);
        CheckThrowSomethingMissing(ConfigNames.AUTH_TENANT, this.config.teamsAppTenant);
        CheckThrowSomethingMissing(ConfigNames.SITE_ENDPOINT, this.config.provision.siteEndpoint);

        // Update config for manifest.json
        this.ctx.config.set(ContextConfigKeys.WEB_APPLICATION_INFO_ID, teamsAppClientId);
        this.ctx.config.set(ContextConfigKeys.WEB_APPLICATION_INFO_RESOURCE, `api://botid-${this.config.scaffold.botId}`);
        this.ctx.config.set(ContextConfigKeys.VALID_DOMAINS, [`${this.config.provision.siteName}.${WebAppConstants.WEB_APP_SITE_DOMAIN}`]);

        const webSiteMgmtClient = factory.createWebSiteMgmtClient(
            this.config.provision.serviceClientCredentials!,
            this.config.provision.subscriptionId!,
        );

        const siteEnvelope: appService.WebSiteManagementModels.Site = LanguageStrategy.getSiteEnvelope(
            this.config.scaffold.programmingLanguage!,
            this.config.provision.appServicePlan!,
            this.config.provision.location!,
            [
                { name: "TeamsAppId", value: teamsAppClientId },
                { name: "TeamsAppPassword", value: teamsAppClientSecret },
                { name: "TeamsAppTenant", value: teamsAppTenant },
                { name: "BaseUrl", value: baseUrl },
            ],
        );

        let res = undefined;

        try {
            res = await webSiteMgmtClient.webApps.createOrUpdate(
                this.config.provision.resourceGroup!,
                this.config.provision.siteName!,
                siteEnvelope,
            );
        } catch (e) {
            throw new ConfigUpdatingException(e);
        }

        this.logRestResponse(res);

        if (!res || !utils.isHttpCodeOkOrCreated(res._response.status)) {
            throw new ConfigUpdatingException();
        }

        // 3. Update message endpoint for bot registration.
        switch (this.config.scaffold.wayToRegisterBot) {
            case WayToRegisterBot.CreateNew: {
                await this.updateMessageEndpoint(`${this.config.provision.siteEndpoint}/api/messages`);
                break;
            }
            case WayToRegisterBot.ReuseExisting: {
                // Remind end developers to update message endpoint manually.
                await DialogUtils.show(
                    context,
                    `Please update bot"s message endpoint manually using ${this.config.provision.siteEndpoint}/api/messages before you run this bot.`,
                );
                break;
            }
        }

        this.telemetryStepOutSuccess(LifecycleFuncNames.POST_PROVISION);

        return ResultFactory.Success();
    }

    public async preDeploy(context: PluginContext): Promise<FxResult> {

        this.ctx = context;

        this.telemetryStepIn(LifecycleFuncNames.PRE_DEPLOY);

        this.markEnterAndLogConfig(LifecycleFuncNames.PRE_DEPLOY);

        await this.config.restoreConfigFromContext(context);

        // Preconditions checking.
        const packDir = this.config.scaffold.workingDir!;

        const packDirExisted = await fs.pathExists(packDir);
        if (!packDirExisted) {
            throw new PackDirExistenceException();
        }

        CheckThrowSomethingMissing(ConfigNames.SITE_ENDPOINT, this.config.provision.siteEndpoint);
        CheckThrowSomethingMissing(ConfigNames.PROGRAMMING_LANGUAGE, this.config.scaffold.programmingLanguage);
        CheckThrowSomethingMissing(ConfigNames.SUBSCRIPTION_ID, this.config.provision.subscriptionId);
        CheckThrowSomethingMissing(ConfigNames.SERVICE_CLIENT_CREDENTIALS, this.config.provision.serviceClientCredentials);
        CheckThrowSomethingMissing(ConfigNames.RESOURCE_GROUP, this.config.provision.resourceGroup);

        if (!utils.isDomainValidForAzureWebApp(this.config.provision.siteEndpoint!)) {
            throw new ValidationException("siteEndpoint", this.config.provision.siteEndpoint!);
        }

        this.telemetryStepOutSuccess(LifecycleFuncNames.PRE_DEPLOY);

        return ResultFactory.Success();
    }

    public async deploy(context: PluginContext): Promise<FxResult> {

        this.ctx = context;

        const handler = await ProgressBarFactory.newProgressBar(ProgressBarConstants.DEPLOY_TITLE, ProgressBarConstants.DEPLOY_STEPS_NUM, this.ctx);

        await handler?.start(ProgressBarConstants.DEPLOY_STEP_START);

        this.telemetryStepIn(LifecycleFuncNames.DEPLOY);

        this.markEnterAndLogConfig(LifecycleFuncNames.DEPLOY);

        await this.config.restoreConfigFromContext(context);

        const packDir = this.config.scaffold.workingDir!;

        await handler?.next(ProgressBarConstants.DEPLOY_STEP_BUILD_ZIP);
        const zipBuffer = await LanguageStrategy.buildAndZipPackage(this.config.scaffold.programmingLanguage!, packDir);

        // 2.2 Retrieve publishing credentials.
        let publishingUserName = "";
        let publishingPassword: string | undefined = undefined;

        const webSiteMgmtClient = new appService.WebSiteManagementClient(
            this.config.provision.serviceClientCredentials!,
            this.config.provision.subscriptionId!,
        );

        await handler?.next(ProgressBarConstants.DEPLOY_STEP_LIST_CRED);

        let listResponse = undefined;
        try {
            listResponse = await webSiteMgmtClient.webApps.listPublishingCredentials(
                this.config.provision.resourceGroup!,
                this.config.provision.siteName!,
            );
        } catch (e) {
            throw new ListPublishingCredentialsException(e);
        }

        this.logRestResponse(listResponse);

        if (!listResponse || !utils.isHttpCodeOkOrCreated(listResponse._response.status)) {
            throw new ListPublishingCredentialsException();
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
            throw new ZipDeployException(e);
        }

        this.logRestResponse(res);

        if (!res || !utils.isHttpCodeOkOrCreated(res.status)) {
            throw new ZipDeployException();
        }

        this.telemetryStepOutSuccess(LifecycleFuncNames.DEPLOY);

        return ResultFactory.Success();
    }

    public async localDebug(context: PluginContext): Promise<FxResult> {

        CheckThrowSomethingMissing(ConfigNames.PROGRAMMING_LANGUAGE, this.config.scaffold.programmingLanguage);
        // CheckThrowSomethingMissing(ConfigNames.GRAPH_TOKEN, this.config.scaffold.graphToken);
        CheckThrowSomethingMissing(ConfigNames.SUBSCRIPTION_ID, this.config.provision.subscriptionId);
        CheckThrowSomethingMissing(ConfigNames.SERVICE_CLIENT_CREDENTIALS, this.config.provision.serviceClientCredentials);
        CheckThrowSomethingMissing(ConfigNames.RESOURCE_GROUP, this.config.provision.resourceGroup);

        this.ctx = context;

        const handler = await ProgressBarFactory.newProgressBar(ProgressBarConstants.LOCAL_DEBUG_TITLE, ProgressBarConstants.LOCAL_DEBUG_STEPS_NUM, this.ctx);

        await handler?.start(ProgressBarConstants.LOCAL_DEBUG_STEP_START);

        this.telemetryStepIn(LifecycleFuncNames.LOCAL_DEBUG);

        this.markEnterAndLogConfig(LifecycleFuncNames.LOCAL_DEBUG);

        /**
         * Do bot registration.
         */
        await this.config.restoreConfigFromContext(context);

        if (this.config.scaffold.wayToRegisterBot === WayToRegisterBot.CreateNew) {
            await handler?.next(ProgressBarConstants.LOCAL_DEBUG_STEP_BOT_REG);
            await this.createNewBotRegistration();

            await handler?.next(ProgressBarConstants.LOCAL_DEBUG_STEP_REPLACEMENT);
            // Replace {BOT_ID} & {BOT_PASSWORD} on disk.
            const configFiles = LanguageStrategy.getConfigFiles(this.config.scaffold.programmingLanguage!);
            configFiles.forEach((fileName) => {
                const fullFilePath: string = path.join(this.config.scaffold.workingDir!, fileName);
                let fileContent: string = fs.readFileSync(fullFilePath, CommonStrings.DEFAULT_FILE_ENCODING);

                fileContent = fileContent.replace(ScaffoldPlaceholders.BOT_ID, this.config.scaffold.botId!);
                fileContent = fileContent.replace(ScaffoldPlaceholders.BOT_PASSWORD, this.config.scaffold.botPassword!);

                fs.writeFileSync(fullFilePath, fileContent);
            });
        }

        this.telemetryStepOutSuccess(LifecycleFuncNames.LOCAL_DEBUG);

        return ResultFactory.Success();
    }

    public async postLocalDebug(context: PluginContext): Promise<FxResult> {

        this.ctx = context;

        this.telemetryStepIn(LifecycleFuncNames.POST_LOCAL_DEBUG);

        this.markEnterAndLogConfig(LifecycleFuncNames.POST_LOCAL_DEBUG);

        /**
         * Do message endpoint updating.
         */
        await this.config.restoreConfigFromContext(context);

        CheckThrowSomethingMissing(ConfigNames.LOCAL_ENDPOINT, this.config.localDebug.localEndpoint);

        switch (this.config.scaffold.wayToRegisterBot) {
            case WayToRegisterBot.CreateNew: {
                await this.updateMessageEndpoint(`${this.config.localDebug.localEndpoint}/api/messages`);
                break;
            }
            case WayToRegisterBot.ReuseExisting: {
                // Remind end developers to update message endpoint manually.
                await DialogUtils.show(
                    context,
                    `Please update bot"s message endpoint manually using ${this.config.provision.siteEndpoint}/api/messages before you run this bot.`,
                );
                break;
            }
        }

        this.telemetryStepOutSuccess(LifecycleFuncNames.POST_LOCAL_DEBUG);

        return ResultFactory.Success();
    }

    private async updateMessageEndpoint(endpoint: string) {
        this.telemetryStepIn(LifecycleFuncNames.UPDATE_MESSAGE_ENDPOINT);

        this.markEnterAndLogConfig(LifecycleFuncNames.UPDATE_MESSAGE_ENDPOINT, endpoint);

        const botClient = factory.createAzureBotServiceClient(
            this.config.provision.serviceClientCredentials!,
            this.config.provision.subscriptionId!,
        );

        if (!this.config.provision.botChannelRegName) {
            throw new SomethingMissingException(CommonStrings.BOT_CHANNEL_REGISTRATION);
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
            throw new MessageEndpointUpdatingException(endpoint, e);
        }

        this.logRestResponse(botResponse);

        if (!botResponse || !utils.isHttpCodeOkOrCreated(botResponse._response.status)) {
            throw new MessageEndpointUpdatingException(endpoint);
        }

        this.telemetryStepOutSuccess(LifecycleFuncNames.UPDATE_MESSAGE_ENDPOINT);
    }

    private async reuseExistingBotRegistration() {
        this.telemetryStepIn(LifecycleFuncNames.REUSE_EXISTING_BOT_REG);

        this.markEnterAndLogConfig(LifecycleFuncNames.REUSE_EXISTING_BOT_REG);

        const rawBotId = this.ctx!.answers?.get(QuestionNames.GET_BOT_ID);
        if (!rawBotId) {
            throw new UserInputsException(QuestionNames.GET_BOT_ID, rawBotId as string);
        }
        const botId = rawBotId as string;

        const rawBotPassword = this.ctx!.answers?.get(QuestionNames.GET_BOT_PASSWORD);
        if (!rawBotPassword) {
            throw new UserInputsException(QuestionNames.GET_BOT_PASSWORD, rawBotPassword as string);
        }
        const botPassword = rawBotPassword as string;

        this.telemetryStepOutSuccess(LifecycleFuncNames.REUSE_EXISTING_BOT_REG);

        return {
            botId: botId,
            botPassword: botPassword,
        };
    }

    private async createNewBotRegistration() {
        this.telemetryStepIn(LifecycleFuncNames.CREATE_NEW_BOT_REG);

        this.markEnterAndLogConfig(LifecycleFuncNames.CREATE_NEW_BOT_REG);

        // 1. Create a new AAD App Registraion with client secret.
        const appStudioToken = await this.ctx?.appStudioToken?.getAccessToken();

        const aadDisplayName = ResourceNameFactory.createCommonName(this.ctx?.app.name.short);

        const botAuthCreds = await aadReg.registerAADAppAndGetSecretByAppStudio(
            appStudioToken!,
            aadDisplayName
        );

        // 2. Provision a bot channel registration resource on azure.
        const botClient = factory.createAzureBotServiceClient(
            this.config.provision.serviceClientCredentials!,
            this.config.provision.subscriptionId!,
        );

        const botChannelRegistrationName = ResourceNameFactory.createCommonName(this.ctx?.app.name.short);

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
            throw new ProvisionException(CommonStrings.BOT_CHANNEL_REGISTRATION, e);
        }

        this.logRestResponse(botResponse);

        if (!botResponse || !utils.isHttpCodeOkOrCreated(botResponse._response.status)) {
            throw new ProvisionException(CommonStrings.BOT_CHANNEL_REGISTRATION);
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
            throw new ProvisionException(CommonStrings.MS_TEAMS_CHANNEL, e);
        }

        this.logRestResponse(channelResponse);

        if (!channelResponse || !utils.isHttpCodeOkOrCreated(channelResponse._response.status)) {

            throw new ProvisionException(CommonStrings.MS_TEAMS_CHANNEL);
        }

        this.config.scaffold.botId = botAuthCreds.clientId;
        this.config.scaffold.botPassword = botAuthCreds.clientSecret;
        this.config.provision.botChannelRegName = botChannelRegistrationName;

        this.ctx!.config.set(ContextConfigKeys.BOTS_SECTION, utils.genBotSectionInManifest(this.config.scaffold.botId!));

        this.telemetryStepOutSuccess(LifecycleFuncNames.CREATE_NEW_BOT_REG);
    }

    private markEnterAndLogConfig(funcName: string, joinedParams?: string) {
        this.ctx?.logProvider?.debug(Messages.EnterFunc(funcName, joinedParams));
        this.ctx?.logProvider?.debug(`config: ${this.config.toString()}\n`);
    }

    private logRestResponse(obj: any) {

        if (!obj) {
            return;
        }

        let responseString = undefined;
        try {
            // Catch circular reference exception when meet some complex response.
            responseString = JSON.stringify(obj);
        } catch (e) {
            responseString = e.message;
        }

        this.ctx?.logProvider?.debug(`Rest response: ${responseString}.\n`);
    }

    private telemetryStepIn(funcName: string) {
        this.ctx?.telemetryReporter?.sendTelemetryEvent(`${funcName}-start`, {
            component: TelemetryStrings.COMPONENT_NAME,
        });
    }

    private telemetryStepOutSuccess(funcName: string) {
        this.ctx?.telemetryReporter?.sendTelemetryEvent(`${funcName}-end`, {
            component: TelemetryStrings.COMPONENT_NAME,
            success: "yes",
        });
    }
}
