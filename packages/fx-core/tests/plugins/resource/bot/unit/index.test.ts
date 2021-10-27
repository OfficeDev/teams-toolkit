// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as sinon from "sinon";
import { default as chaiAsPromised } from "chai-as-promised";
import AdmZip from "adm-zip";
import path from "path";

import { TeamsBot } from "../../../../../src/plugins/resource/bot/index";
import { TeamsBotImpl } from "../../../../../src/plugins/resource/bot/plugin";

import * as utils from "../../../../../src/plugins/resource/bot/utils/common";
import { ProgrammingLanguage } from "../../../../../src/plugins/resource/bot/enums/programmingLanguage";
import { FxBotPluginResultFactory as ResultFactory } from "../../../../../src/plugins/resource/bot/result";
import * as testUtils from "./utils";
import { PluginActRoles } from "../../../../../src/plugins/resource/bot/enums/pluginActRoles";
import * as factory from "../../../../../src/plugins/resource/bot/clientFactory";
import { CommonStrings } from "../../../../../src/plugins/resource/bot/resources/strings";
import { AzureOperations } from "../../../../../src/plugins/resource/bot/azureOps";
import { AADRegistration } from "../../../../../src/plugins/resource/bot/aadRegistration";
import { BotAuthCredential } from "../../../../../src/plugins/resource/bot/botAuthCredential";
import { AppStudio } from "../../../../../src/plugins/resource/bot/appStudio/appStudio";
import { LanguageStrategy } from "../../../../../src/plugins/resource/bot/languageStrategy";
import mockedEnv from "mocked-env";
import { isMultiEnvEnabled } from "../../../../../src";
import { LocalSettingsBotKeys } from "../../../../../src/common/localSettingsConstants";

chai.use(chaiAsPromised);

describe("Teams Bot Resource Plugin", () => {
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

    afterEach(async () => {
      sinon.restore();
      await fs.remove(scaffoldDir);
    });

    it("happy path typescript", async () => {
      // Arrange
      botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.TypeScript;
      botPluginImpl.config.actRoles = [PluginActRoles.Bot];

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
      botPluginImpl.config.actRoles = [PluginActRoles.MessageExtension];

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
      const pluginContext = testUtils.newPluginContext();
      pluginContext.projectSettings!.appName = "anything";
      botPluginImpl.config.scaffold.botId = utils.genUUID();
      botPluginImpl.config.scaffold.botPassword = utils.genUUID();
      botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.JavaScript;
      botPluginImpl.config.saveConfigIntoContext(pluginContext);
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
      const pluginContext = testUtils.newPluginContext();
      pluginContext.projectSettings!.appName = "anything";
      botPluginImpl.config.saveConfigIntoContext(pluginContext);
      const fakeCreds = testUtils.generateFakeTokenCredentialsBase();

      let item: any = { registrationState: "Unregistered" };
      const namespace = ["ut"];
      const fakeRPClient: any = {
        get: (namespace: string) => item,
        register: (namespace: string) => {
          item = {};
          item = { ...item, $namespace: { registrationState: "Registered" } };
          return item;
        },
      };
      sinon.stub(factory, "createResourceProviderClient").returns(fakeRPClient);

      sinon.stub(pluginContext.appStudioToken!, "getAccessToken").resolves("anything");
      sinon.stub(botPluginImpl.config.scaffold, "botAADCreated").returns(true);

      sinon
        .stub(pluginContext.azureAccountProvider!, "getAccountCredentialAsync")
        .resolves(fakeCreds);

      const fakeBotClient = factory.createAzureBotServiceClient(
        testUtils.generateFakeServiceClientCredentials(),
        "anything"
      );
      sinon.stub(fakeBotClient.bots, "create").resolves({
        status: 200,
      });
      sinon.stub(fakeBotClient.channels, "create").resolves({
        status: 200,
      });

      sinon.stub(factory, "createAzureBotServiceClient").returns(fakeBotClient);
      sinon.stub(AzureOperations, "CreateOrUpdateAzureWebApp").resolves({
        defaultHostName: "abc.azurewebsites.net",
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
      const pluginContext = testUtils.newPluginContext();
      botPluginImpl.config.scaffold.botId = "anything";
      botPluginImpl.config.scaffold.botPassword = "anything";
      botPluginImpl.config.provision.siteEndpoint = "https://anything.azurewebsites.net";
      botPluginImpl.config.provision.botChannelRegName = "anything";
      botPluginImpl.config.saveConfigIntoContext(pluginContext);

      sinon.stub(pluginContext.appStudioToken!, "getAccessToken").resolves("anything");
      sinon.stub(botPluginImpl.config.scaffold, "botAADCreated").returns(true);
      const fakeCreds = testUtils.generateFakeTokenCredentialsBase();
      sinon
        .stub(pluginContext.azureAccountProvider!, "getAccountCredentialAsync")
        .resolves(fakeCreds);

      const fakeWebClient = factory.createWebSiteMgmtClient(
        testUtils.generateFakeServiceClientCredentials(),
        "anything"
      );
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
    let botPlugin: TeamsBot;
    let botPluginImpl: TeamsBotImpl;
    let rootDir: string;
    let botWorkingDir: string;

    beforeEach(async () => {
      botPlugin = new TeamsBot();
      botPluginImpl = new TeamsBotImpl();
      botPlugin.teamsBotImpl = botPluginImpl;
      rootDir = path.join(__dirname, utils.genUUID());
      botWorkingDir = path.join(rootDir, CommonStrings.BOT_WORKING_DIR_NAME);
      await fs.ensureDir(botWorkingDir);
    });

    afterEach(async () => {
      sinon.restore();
      await fs.remove(rootDir);
    });

    it("Happy Path", async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();
      botPluginImpl.config.provision.siteEndpoint = "https://abc.azurewebsites.net";
      botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.JavaScript;
      if (isMultiEnvEnabled()) {
        botPluginImpl.config.provision.botWebAppResourceId = "botWebAppResourceId";
      }
      pluginContext.root = rootDir;
      botPluginImpl.config.saveConfigIntoContext(pluginContext);
      // Act
      const result = await botPlugin.preDeploy(pluginContext);

      // Assert
      chai.assert.isTrue(result.isOk());
    });
  });

  describe("Test deploy", () => {
    let botPlugin: TeamsBot;
    let botPluginImpl: TeamsBotImpl;
    let rootDir: string;
    let mockedEnvRestore: () => void;

    beforeEach(() => {
      botPlugin = new TeamsBot();
      botPluginImpl = new TeamsBotImpl();
      botPlugin.teamsBotImpl = botPluginImpl;
      rootDir = path.join(__dirname, utils.genUUID());

      sinon.stub(LanguageStrategy, "localBuild").resolves();
      sinon.stub(utils, "zipAFolder").returns(new AdmZip().toBuffer());
      sinon.stub(AzureOperations, "ListPublishingCredentials").resolves({
        publishingUserName: "test-username",
        publishingPassword: "test-password",
      });
      sinon.stub(AzureOperations, "ZipDeployPackage").resolves();
    });

    afterEach(async () => {
      sinon.restore();
      mockedEnvRestore();
      await fs.remove(rootDir);
    });

    it("Happy Path with Arm support disabled", async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();
      pluginContext.root = rootDir;
      sinon
        .stub(pluginContext.azureAccountProvider!, "getAccountCredentialAsync")
        .resolves(testUtils.generateFakeTokenCredentialsBase());
      botPluginImpl.config.provision.siteName = "test-site-name";
      mockedEnvRestore = mockedEnv({
        TEAMSFX_INSIDER_PREVIEW: "0",
      });

      // Act
      const result = await botPlugin.deploy(pluginContext);

      // Assert
      chai.assert.isTrue(result.isOk());
    });

    it("Happy Path with Arm support enabled", async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();
      pluginContext.root = rootDir;
      sinon
        .stub(pluginContext.azureAccountProvider!, "getAccountCredentialAsync")
        .resolves(testUtils.generateFakeTokenCredentialsBase());
      pluginContext.config.set(
        "botWebAppResourceId",
        "/subscriptions/test-subscription/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-webapp"
      );
      mockedEnvRestore = mockedEnv({
        TEAMSFX_INSIDER_PREVIEW: "1",
      });

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
      pluginContext.projectSettings!.appName = "anything";
      sinon.stub(pluginContext.appStudioToken!, "getAccessToken").resolves("anything");
      sinon.stub(botPluginImpl.config.localDebug, "botAADCreated").returns(false);
      const botAuthCreds = new BotAuthCredential();
      botAuthCreds.clientId = "anything";
      botAuthCreds.clientSecret = "anything";
      botAuthCreds.objectId = "anything";
      sinon.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves(botAuthCreds);
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
      pluginContext.projectSettings!.appName = "anything";
      botPluginImpl.config.localDebug.localBotId = "anything";
      botPluginImpl.config.saveConfigIntoContext(pluginContext);
      if (isMultiEnvEnabled()) {
        pluginContext.localSettings?.bot?.set(
          LocalSettingsBotKeys.BotEndpoint,
          "https://bot.local.endpoint"
        );
      }
      sinon.stub(pluginContext.appStudioToken!, "getAccessToken").resolves("anything");
      sinon.stub(AppStudio, "updateMessageEndpoint").resolves();

      // Act
      const result = await botPlugin.postLocalDebug(pluginContext);

      // Assert
      chai.assert.isTrue(result.isOk());
    });
  });
});
