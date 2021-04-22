// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as sinon from "sinon";
import { default as chaiAsPromised } from "chai-as-promised";
import AdmZip from "adm-zip";
import path from "path";
import { Stage } from "fx-api";

import { TeamsBot } from "../../../../../src/plugins/resource/bot/index";
import { TeamsBotImpl } from "../../../../../src/plugins/resource/bot/plugin";

import { QuestionNames } from "../../../../../src/plugins/resource/bot/constants";
import * as downloadByUrl from "../../../../../src/plugins/resource/bot/utils/downloadByUrl";
import * as utils from "../../../../../src/plugins/resource/bot/utils/common";
import { ProgrammingLanguage } from "../../../../../src/plugins/resource/bot/enums/programmingLanguage";
import { FxBotPluginResultFactory as ResultFactory } from "../../../../../src/plugins/resource/bot/result";
import { WayToRegisterBot } from "../../../../../src/plugins/resource/bot/enums/wayToRegisterBot";
import * as testUtils from "./utils";
import { PluginActRoles } from "../../../../../src/plugins/resource/bot/enums/pluginActRoles";
import * as factory from "../../../../../src/plugins/resource/bot/clientFactory";
import { CommonStrings } from "../../../../../src/plugins/resource/bot/resources/strings";
import { AzureOperations } from "../../../../../src/plugins/resource/bot/azureOps";
import { AADRegistration } from "../../../../../src/plugins/resource/bot/aadRegistration";
import { BotAuthCredential } from "../../../../../src/plugins/resource/bot/botAuthCredential";
import { AppStudio } from "../../../../../src/plugins/resource/bot/appStudio/appStudio";
import { LanguageStrategy } from "../../../../../src/plugins/resource/bot/languageStrategy";

chai.use(chaiAsPromised);

describe("Teams Bot Resource Plugin", () => {
    describe("Test getQuestions", () => {
        afterEach(() => {
            sinon.restore();
        });

        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;

        beforeEach(() => {
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;
        });

        it("Stage.debug", async () => {
            // Arrange
            // Act
            const result = await botPlugin.getQuestions(Stage.debug, testUtils.newPluginContext());

            // Assert
            chai.assert.isTrue(result.isOk());
        });

        it("Stage.create", async () => {
            // Arrange
            // Act
            const result = await botPlugin.getQuestions(Stage.create, testUtils.newPluginContext());

            // Assert
            chai.assert.isTrue(result.isOk());
        });
    });
    describe("Test preScaffold", () => {
        afterEach(() => {
            sinon.restore();
        });

        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;

        beforeEach(() => {
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;
        });

        it("Reuse an existing bot registration", async () => {
            // Arrange
            const context = testUtils.newPluginContext();
            context.answers?.set(QuestionNames.PROGRAMMING_LANGUAGE, ProgrammingLanguage.TypeScript);
            context.answers?.set(QuestionNames.WAY_TO_REGISTER_BOT, WayToRegisterBot.ReuseExisting);

            const fakeBotId = utils.genUUID();
            const fakeBotPassword = utils.genUUID();
            context.answers?.set(QuestionNames.GET_BOT_ID, fakeBotId);
            context.answers?.set(QuestionNames.GET_BOT_PASSWORD, fakeBotPassword);

            // Act
            const result = await botPlugin.preScaffold(context);

            // Assert
            chai.assert.deepEqual(result, ResultFactory.Success());
            chai.assert.isTrue(botPluginImpl.config.scaffold.botId === fakeBotId);
            chai.assert.isTrue(botPluginImpl.config.scaffold.botPassword === fakeBotPassword);
        });
    });

    describe("Test scaffold", () => {
        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;
        let scaffoldDir = "";

        beforeEach(async () => {
            // Arrange
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;

            botPluginImpl.config.scaffold.botId = utils.genUUID();
            botPluginImpl.config.scaffold.botPassword = utils.genUUID();

            const randomDirName = utils.genUUID();
            scaffoldDir = path.resolve(__dirname, randomDirName);
            await fs.ensureDir(scaffoldDir);
        });

        afterEach(() => {
            sinon.restore();
        });

        it("happy path typescript", async () => {
            // Arrange
            botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.TypeScript;
            botPluginImpl.config.scaffold.wayToRegisterBot = WayToRegisterBot.CreateNew;
            botPluginImpl.config.actRoles = [PluginActRoles.Bot];

            // Prepare fake zip buffer
            const zip = new AdmZip();
            zip.addFile(
                "anyfile",
                Buffer.from("anycontent"),
            );

            sinon.stub(downloadByUrl, "downloadByUrl").resolves(zip.toBuffer());

            const pluginContext = testUtils.newPluginContext();
            pluginContext.root = scaffoldDir;

            // Act
            const result = await botPlugin.scaffold(pluginContext);

            // Assert
            chai.assert.deepEqual(result, ResultFactory.Success());
        });

        it("happy path javascript", async () => {
            // Arrange
            botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.JavaScript;
            botPluginImpl.config.scaffold.wayToRegisterBot = WayToRegisterBot.CreateNew;
            botPluginImpl.config.actRoles = [PluginActRoles.MessageExtension];

            // Prepare fake zip buffer
            const zip = new AdmZip();
            zip.addFile(
                "anyfile",
                Buffer.from("anycontent"),
            );

            sinon.stub(downloadByUrl, "downloadByUrl").resolves(zip.toBuffer());

            const pluginContext = testUtils.newPluginContext();
            pluginContext.root = scaffoldDir;

            // Act
            const result = await botPlugin.scaffold(pluginContext);

            // Assert
            chai.assert.deepEqual(result, ResultFactory.Success());
        });
    });

    describe("Test preProvision", () => {
        afterEach(() => {
            sinon.restore();
        });

        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;

        beforeEach(() => {
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;
        });

        it("Happy Path", async () => {
            // Arrange
            botPluginImpl.config.scaffold.botId = utils.genUUID();
            botPluginImpl.config.scaffold.botPassword = utils.genUUID();
            botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.JavaScript;
            botPluginImpl.config.provision.subscriptionId = utils.genUUID();
            botPluginImpl.config.provision.resourceGroup = "anything";
            botPluginImpl.config.provision.location = "global";

            const pluginContext = testUtils.newPluginContext();
            pluginContext.app.name.short = "anything";

            // Act
            const result = await botPlugin.preProvision(pluginContext);

            // Assert
            chai.assert.isTrue(result.isOk());
        });
    });

    describe("Test Provision", () => {
        afterEach(() => {
            sinon.restore();
        });

        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;

        beforeEach(() => {
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;
        });

        it("Happy Path", async () => {
            // Arrange
            botPluginImpl.config.scaffold.wayToRegisterBot = WayToRegisterBot.CreateNew;
            botPluginImpl.config.provision.subscriptionId = "anything";
            botPluginImpl.config.provision.resourceGroup = "anything";
            const pluginContext = testUtils.newPluginContext();
            pluginContext.app.name.short = "anything";

            sinon.stub(pluginContext.appStudioToken!, "getAccessToken").resolves("anything");
            sinon.stub(botPluginImpl.config.scaffold, "botRegistrationCreated").returns(true);
            const fakeCreds = testUtils.generateFakeTokenCredentialsBase();
            sinon.stub(pluginContext.azureAccountProvider!, "getAccountCredentialAsync").resolves(fakeCreds);

            const fakeBotClient = factory.createAzureBotServiceClient(testUtils.generateFakeServiceClientCredentials(), "anything");
            sinon.stub(fakeBotClient.bots, "create").resolves({
                status: 200
            });
            sinon.stub(fakeBotClient.channels, "create").resolves({
                status: 200
            });

            sinon.stub(factory, "createAzureBotServiceClient").returns(fakeBotClient);
            sinon.stub(AzureOperations, "CreateOrUpdateAzureWebApp").resolves({
                defaultHostName: "abc.azurewebsites.net"
            });
            sinon.stub(AzureOperations, "CreateOrUpdateAppServicePlan").resolves();
            sinon.stub(AzureOperations, "CreateBotChannelRegistration").resolves();
            sinon.stub(AzureOperations, "LinkTeamsChannel").resolves();

            // Act
            const result = await botPlugin.provision(pluginContext);

            // Assert
            chai.assert.isTrue(result.isOk());
        });
    });

    describe("Test postProvision", () => {
        afterEach(() => {
            sinon.restore();
        });

        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;

        beforeEach(() => {
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;
        });

        it("Happy Path", async () => {
            // Arrange
            botPluginImpl.config.scaffold.botId = "anything";
            botPluginImpl.config.scaffold.botPassword = "anything";
            botPluginImpl.config.teamsAppClientId = "anything";
            botPluginImpl.config.teamsAppClientSecret = "anything";
            botPluginImpl.config.teamsAppTenant = "anything";
            botPluginImpl.config.applicationIdUris = "anything";
            botPluginImpl.config.provision.siteEndpoint = "anything";

            const pluginContext = testUtils.newPluginContext();

            sinon.stub(pluginContext.appStudioToken!, "getAccessToken").resolves("anything");
            sinon.stub(botPluginImpl.config.scaffold, "botRegistrationCreated").returns(true);
            const fakeCreds = testUtils.generateFakeTokenCredentialsBase();
            sinon.stub(pluginContext.azureAccountProvider!, "getAccountCredentialAsync").resolves(fakeCreds);

            const fakeWebClient = factory.createWebSiteMgmtClient(testUtils.generateFakeServiceClientCredentials(), "anything");
            sinon.stub(factory, "createWebSiteMgmtClient").returns(fakeWebClient);

            sinon.stub(AzureOperations, "CreateOrUpdateAzureWebApp").resolves();
            sinon.stub(AzureOperations, "UpdateBotChannelRegistration").resolves();

            // Act
            const result = await botPlugin.postProvision(pluginContext);

            // Assert
            chai.assert.isTrue(result.isOk());
        });
    });

    describe("Test preDeploy", () => {
        afterEach(() => {
            sinon.restore();
        });

        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;

        beforeEach(() => {
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;
        });

        it("Happy Path", async () => {
            // Arrange
            const pluginContext = testUtils.newPluginContext();
            botPluginImpl.config.provision.provisioned = true;
            botPluginImpl.config.provision.siteEndpoint = "https://abc.azurewebsites.net";
            botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.JavaScript;
            pluginContext.root = path.join(__dirname, utils.genUUID());
            await fs.ensureDir(path.join(pluginContext.root, CommonStrings.BOT_WORKING_DIR_NAME));
            botPluginImpl.config.provision.subscriptionId = "anything";
            botPluginImpl.config.provision.resourceGroup = "anything";

            // Act
            const result = await botPlugin.preDeploy(pluginContext);

            // Assert
            chai.assert.isTrue(result.isOk());
        });
    });

    describe("Test deploy", () => {
        afterEach(() => {
            sinon.restore();
        });

        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;

        beforeEach(() => {
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;
        });

        it("Happy Path", async () => {
            // Arrange
            const pluginContext = testUtils.newPluginContext();
            botPluginImpl.config.scaffold.workingDir = __dirname;
            botPluginImpl.config.provision.siteName = "anything";
            botPluginImpl.config.provision.subscriptionId = "anything";
            sinon.stub(LanguageStrategy, "localBuild").resolves();
            sinon.stub(utils, "zipAFolder").returns((new AdmZip()).toBuffer());
            const fakeCreds = testUtils.generateFakeTokenCredentialsBase();
            sinon.stub(pluginContext.azureAccountProvider!, "getAccountCredentialAsync").resolves(fakeCreds);
            sinon.stub(AzureOperations, "ListPublishingCredentials").resolves({
                publishingUserName: "anything",
                publishingPassword: "anything"
            });
            sinon.stub(AzureOperations, "ZipDeployPackage").resolves();

            // Act
            const result = await botPlugin.deploy(pluginContext);

            // Assert
            chai.assert.isTrue(result.isOk());
        });
    });


    describe("Test localDebug", () => {
        afterEach(() => {
            sinon.restore();
        });

        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;

        beforeEach(() => {
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;
        });

        it("Happy Path", async () => {
            // Arrange
            const pluginContext = testUtils.newPluginContext();
            pluginContext.app.name.short = "anything";
            botPluginImpl.config.scaffold.wayToRegisterBot = WayToRegisterBot.CreateNew;
            sinon.stub(pluginContext.appStudioToken!, "getAccessToken").resolves("anything");
            sinon.stub(botPluginImpl.config.localDebug, "botRegistrationCreated").returns(false);
            const botAuthCreds = new BotAuthCredential();
            botAuthCreds.clientId = "anything";
            botAuthCreds.clientSecret = "anything";
            botAuthCreds.objectId = "anything";
            sinon.stub(AADRegistration, "registerAADAppAndGetSecretByAppStudio").resolves(botAuthCreds);
            sinon.stub(AppStudio, "createBotRegistration").resolves();

            // Act
            const result = await botPlugin.localDebug(pluginContext);

            // Assert
            chai.assert.isTrue(result.isOk());
        });
    });

    describe("Test postLocalDebug", () => {
        afterEach(() => {
            sinon.restore();
        });

        let botPlugin: TeamsBot;
        let botPluginImpl: TeamsBotImpl;

        beforeEach(() => {
            botPlugin = new TeamsBot();
            botPluginImpl = new TeamsBotImpl();
            botPlugin.teamsBotImpl = botPluginImpl;
        });

        it("Happy Path", async () => {
            // Arrange
            const pluginContext = testUtils.newPluginContext();
            pluginContext.app.name.short = "anything";
            botPluginImpl.config.localDebug.localEndpoint = "anything";
            botPluginImpl.config.localDebug.localBotId = "anything";
            botPluginImpl.config.scaffold.wayToRegisterBot = WayToRegisterBot.CreateNew;
            sinon.stub(pluginContext.appStudioToken!, "getAccessToken").resolves("anything");
            sinon.stub(AppStudio, "updateMessageEndpoint").resolves();

            // Act
            const result = await botPlugin.postLocalDebug(pluginContext);

            // Assert
            chai.assert.isTrue(result.isOk());
        });
    });
});
