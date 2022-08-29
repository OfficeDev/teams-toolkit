// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
const fs = require("fs-extra");
import * as sinon from "sinon";
const AdmZip = require("adm-zip");
import * as path from "path";

import { PluginNames, TeamsBot } from "../../../../../src";
import { TeamsBotImpl } from "../../../../../src/plugins/resource/bot/plugin";
import * as utils from "../../../../../src/plugins/resource/bot/utils/common";
import { ProgrammingLanguage } from "../../../../../src/plugins/resource/bot/enums/programmingLanguage";
import { FxBotPluginResultFactory as ResultFactory } from "../../../../../src/plugins/resource/bot/result";
import * as testUtils from "./utils";
import { PluginActRoles } from "../../../../../src/plugins/resource/bot/enums/pluginActRoles";
import { CommonStrings } from "../../../../../src/plugins/resource/bot/resources/strings";
import { AADRegistration } from "../../../../../src/plugins/resource/bot/aadRegistration";
import { BotAuthCredential } from "../../../../../src/plugins/resource/bot/botAuthCredential";
import { AppStudio } from "../../../../../src/plugins/resource/bot/appStudio/appStudio";
import { LanguageStrategy } from "../../../../../src/plugins/resource/bot/languageStrategy";
import { Func, ok, Stage } from "@microsoft/teamsfx-api";
import { BuiltInSolutionNames } from "../../../../../src/plugins/solution/fx-solution/v3/constants";
import { ResourcePlugins } from "../../../../../src/common/constants";
import { ConfigKeys } from "../../../../../src/plugins/resource/bot/constants";
import { BOT_ID } from "../../../../../src/plugins/resource/appstudio/constants";
import { FunctionsHostedBotImpl } from "../../../../../src/plugins/resource/bot/functionsHostedBot/plugin";
import { ScaffoldConfig } from "../../../../../src/plugins/resource/bot/configs/scaffoldConfig";
import { DotnetBotImpl } from "../../../../../src/plugins/resource/bot/dotnet/plugin";
import { FuncHostedDeployMgr } from "../../../../../src/plugins/resource/bot/functionsHostedBot/deployMgr";
import { AzureOperations } from "../../../../../src/common/azure-hosting/azureOps";
import { HostType } from "../../../../../src/plugins/resource/bot/v2/enum";

describe("Teams Bot Resource Plugin", () => {
  describe("Test plugin implementation dispatching", () => {
    afterEach(() => {
      sinon.restore();
    });

    let botPlugin: TeamsBot;

    beforeEach(() => {
      botPlugin = new TeamsBot();
    });

    it("dispatches to vs", async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();
      pluginContext.projectSettings!.programmingLanguage = "csharp";

      // Act
      const impl = botPlugin.getImpl(pluginContext);

      // Assert
      chai.assert.isTrue(impl instanceof DotnetBotImpl);
    });

    it("dispatches to function hosted bot", async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();
      sinon.stub(ScaffoldConfig, "getBotHostType").returns(HostType.Functions);

      // Act
      const impl = botPlugin.getImpl(pluginContext);

      // Assert
      chai.assert.isTrue(impl instanceof FunctionsHostedBotImpl);
    });

    it("dispatches to app service hosted bot", async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();

      // Act
      const impl = botPlugin.getImpl(pluginContext);

      // Assert
      chai.assert.isTrue(impl instanceof TeamsBotImpl);
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

      sinon.stub(pluginContext.m365TokenProvider!, "getAccessToken").resolves(ok("anything"));
      sinon.stub(botPluginImpl.config.scaffold, "botAADCreated").returns(true);

      // Act
      const result = await botPlugin.provision(pluginContext);

      // Assert
      chai.assert.isTrue(result.isOk());
    });

    it("Register Path", async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();
      pluginContext.projectSettings!.appName = "anything";
      botPluginImpl.config.saveConfigIntoContext(pluginContext);

      sinon.stub(botPluginImpl.config.scaffold, "botAADCreated").returns(false);
      const botAuthCreds = new BotAuthCredential();
      botAuthCreds.clientId = "anything";
      botAuthCreds.clientSecret = "anything";
      botAuthCreds.objectId = "anything";
      sinon.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves(botAuthCreds);

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

      sinon.stub(pluginContext.m365TokenProvider!, "getAccessToken").resolves(ok("anything"));
      sinon.stub(botPluginImpl.config.scaffold, "botAADCreated").returns(true);
      const fakeCreds = testUtils.generateFakeTokenCredentialsBase();
      sinon
        .stub(pluginContext.azureAccountProvider!, "getAccountCredentialAsync")
        .resolves(fakeCreds);
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
      botPluginImpl.config.provision.botWebAppResourceId = "botWebAppResourceId";
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

    beforeEach(() => {
      botPlugin = new TeamsBot();
      botPluginImpl = new TeamsBotImpl();
      botPlugin.teamsBotImpl = botPluginImpl;
      rootDir = path.join(__dirname, utils.genUUID());

      sinon.stub(LanguageStrategy, "localBuild").resolves();
      sinon.stub(utils, "zipAFolder").returns(new AdmZip().toBuffer());
      sinon.stub(AzureOperations, "listPublishingCredentials").resolves({
        publishingUserName: "test-username",
        publishingPassword: "test-password",
      });
      sinon.stub(AzureOperations, "zipDeployPackage").resolves("");
      sinon.stub(AzureOperations, "checkDeployStatus").resolves();
    });

    afterEach(async () => {
      sinon.restore();
      await fs.remove(rootDir);
    });

    it("Happy Path", async () => {
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

      // Act
      const result = await botPlugin.deploy(pluginContext);

      // Assert
      chai.assert.isTrue(result.isOk());
    });
  });

  describe("Test func hosted bot deploy", () => {
    let botPlugin: TeamsBot;
    let botPluginImpl: TeamsBotImpl;
    let rootDir: string;

    beforeEach(() => {
      botPlugin = new TeamsBot();
      botPluginImpl = new FunctionsHostedBotImpl();
      botPlugin.teamsBotImpl = botPluginImpl;
      botPluginImpl.config.scaffold.programmingLanguage = ProgrammingLanguage.JavaScript;
      rootDir = path.join(__dirname, utils.genUUID());

      sinon.stub(LanguageStrategy, "localBuild").resolves();
      sinon.stub(FuncHostedDeployMgr.prototype, "needsToRedeploy").resolves(true);
      sinon.stub(FuncHostedDeployMgr.prototype, "zipAFolder").resolves(new AdmZip().toBuffer());
      sinon.stub(FuncHostedDeployMgr.prototype, "getIgnoreRules").resolves([]);
      sinon.stub(FuncHostedDeployMgr.prototype, "saveDeploymentInfo").resolves();
      sinon.stub(AzureOperations, "listPublishingCredentials").resolves({
        publishingUserName: "test-username",
        publishingPassword: "test-password",
      });
      sinon.stub(AzureOperations, "restartWebApp").resolves();
      sinon.stub(AzureOperations, "zipDeployPackage").resolves("");
      sinon.stub(AzureOperations, "checkDeployStatus").resolves();
    });

    afterEach(async () => {
      sinon.restore();
      await fs.remove(rootDir);
    });

    it("Happy Path", async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();
      pluginContext.root = rootDir;
      sinon
        .stub(pluginContext.azureAccountProvider!, "getAccountCredentialAsync")
        .resolves(testUtils.generateFakeTokenCredentialsBase());
      sinon
        .stub(pluginContext.azureAccountProvider!, "getIdentityCredentialAsync")
        .resolves(new testUtils.MyTokenCredential());
      pluginContext.config.set(
        "botWebAppResourceId",
        "/subscriptions/test-subscription/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-webapp"
      );

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
      sinon.stub(pluginContext.m365TokenProvider!, "getAccessToken").resolves(ok("anything"));
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
      pluginContext.envInfo.state.set(
        ResourcePlugins.Bot,
        new Map<string, string>([
          [ConfigKeys.SITE_ENDPOINT, "https://bot.local.endpoint"],
          [BOT_ID, "bot_id"],
        ])
      );
      sinon.stub(pluginContext.m365TokenProvider!, "getAccessToken").resolves(ok("anything"));
      sinon.stub(AppStudio, "updateMessageEndpoint").resolves();

      // Act
      const result = await botPlugin.postLocalDebug(pluginContext);

      // Assert
      chai.assert.isTrue(result.isOk());
    });
  });

  describe("Test getQuestionsForScaffolding", () => {
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

      // Act
      const result = await botPlugin.getQuestions(Stage.create, pluginContext);

      // Assert
      chai.assert.isTrue(result.isOk());
      const node = result._unsafeUnwrap();
      chai.assert.isNotNull(node?.children);
    });

    it("Lifecycles other than create", async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();

      // Act
      const result = await botPlugin.getQuestions(Stage.provision, pluginContext);

      // Assert
      chai.assert.isTrue(result.isOk());
      chai.assert.equal(result._unsafeUnwrap(), undefined);
    });

    describe(".net project support", async () => {
      beforeEach(() => {
        process.env["TEAMSFX_CLI_DOTNET"] = "true";
      });

      afterEach(() => {
        process.env["TEAMSFX_CLI_DOTNET"] = "false";
      });

      it("should return 2 options on scaffolding", async () => {
        const pluginContext = testUtils.newPluginContext();

        const result = await botPlugin.getQuestions(Stage.create, pluginContext);

        chai.assert.isTrue(result.isOk());
        const node = result._unsafeUnwrap();
        chai.assert.isNotNull(node?.children);
        // one for .net, one for nodejs
        chai.assert.equal(node?.children?.length, 2);
      });
    });
  });

  describe("Test getQuestionsForUserTask", () => {
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

    it("Happy Path - addCapability", async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();

      // Act
      const func: Func = {
        namespace: `${BuiltInSolutionNames.azure}/${PluginNames.BOT}`,
        method: "addCapability",
      };
      const result = await botPlugin.getQuestionsForUserTask(func, pluginContext);

      // Assert
      chai.assert.isTrue(result.isOk());
      chai.assert.equal(result._unsafeUnwrap(), undefined);
    });

    it("Happy Path - addFeature", async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();

      // Act
      const func: Func = {
        namespace: `${BuiltInSolutionNames.azure}/${PluginNames.BOT}`,
        method: "addFeature",
      };
      const result = await botPlugin.getQuestionsForUserTask(func, pluginContext);

      // Assert
      chai.assert.isTrue(result.isOk());
      chai.assert.equal(result._unsafeUnwrap(), undefined);
    });

    it("Lifecycles other than addCapability/AddFeature", async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();

      // Act
      const func: Func = {
        namespace: `${BuiltInSolutionNames.azure}/${PluginNames.BOT}`,
        method: "test func",
      };
      const result = await botPlugin.getQuestionsForUserTask(func, pluginContext);

      // Assert
      chai.assert.isTrue(result.isOk());
      chai.assert.equal(result._unsafeUnwrap(), undefined);
    });
  });
});
