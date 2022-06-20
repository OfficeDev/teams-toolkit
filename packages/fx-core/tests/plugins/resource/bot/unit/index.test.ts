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
import * as factory from "../../../../../src/plugins/resource/bot/clientFactory";
import { CommonStrings } from "../../../../../src/plugins/resource/bot/resources/strings";
import { AADRegistration } from "../../../../../src/plugins/resource/bot/aadRegistration";
import { BotAuthCredential } from "../../../../../src/plugins/resource/bot/botAuthCredential";
import { AppStudio } from "../../../../../src/plugins/resource/bot/appStudio/appStudio";
import { LanguageStrategy } from "../../../../../src/plugins/resource/bot/languageStrategy";
import { NodeJSBotPluginV3 } from "../../../../../src/plugins/resource/bot/v3";
import {
  Func,
  ok,
  Platform,
  ProjectSettings,
  Stage,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import {
  BuiltInFeaturePluginNames,
  BuiltInSolutionNames,
} from "../../../../../src/plugins/solution/fx-solution/v3/constants";
import {
  MockedAzureAccountProvider,
  MockedM365Provider,
  MockedV2Context,
} from "../../../solution/util";
import { randomAppName } from "../../../../core/utils";
import * as os from "os";
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

  describe("Test Provision V3 (remote)", () => {
    afterEach(() => {
      sinon.restore();
    });

    beforeEach(() => {});

    it("Happy Path", async () => {
      const botPlugin = new NodeJSBotPluginV3();
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: "1232343534",
        solutionSettings: {
          name: BuiltInSolutionNames.azure,
          version: "3.0.0",
          capabilities: ["Bot"],
          hostType: "Azure",
          azureResources: [],
          activeResourcePlugins: [BuiltInFeaturePluginNames.bot],
        },
      };
      const ctx = new MockedV2Context(projectSettings);
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.VSCode,
        projectPath: path.join(os.tmpdir(), randomAppName()),
      };
      const mockedTokenProvider: TokenProvider = {
        azureAccountProvider: new MockedAzureAccountProvider(),
        m365TokenProvider: new MockedM365Provider(),
      };
      const envInfoV3: v3.EnvInfoV3 = {
        envName: "dev",
        config: {},
        state: {
          solution: {},
          [BuiltInFeaturePluginNames.bot]: { botId: "mockBotId", botPassword: "mockPassword" },
        },
      };

      const fakeCreds = testUtils.generateFakeTokenCredentialsBase();

      let item: any = { registrationState: "Unregistered" };
      const fakeRPClient: any = {
        get: (_: string) => item,
        register: (_: string) => {
          item = {};
          item = { ...item, $namespace: { registrationState: "Registered" } };
          return item;
        },
      };
      sinon.stub(factory, "createResourceProviderClient").returns(fakeRPClient);

      sinon.stub(mockedTokenProvider.m365TokenProvider, "getAccessToken").resolves(ok("anything"));

      sinon
        .stub(mockedTokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(fakeCreds);
      // Act
      const result = await botPlugin.provisionResource(ctx, inputs, envInfoV3, mockedTokenProvider);

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
  describe("Test configResources V3 (remote)", () => {
    afterEach(() => {
      sinon.restore();
    });

    beforeEach(() => {});

    it("Happy Path", async () => {
      const botPlugin = new NodeJSBotPluginV3();
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: "1232343534",
        solutionSettings: {
          name: BuiltInSolutionNames.azure,
          version: "3.0.0",
          capabilities: ["Bot"],
          hostType: "Azure",
          azureResources: [],
          activeResourcePlugins: [BuiltInFeaturePluginNames.bot],
        },
      };
      const ctx = new MockedV2Context(projectSettings);
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.VSCode,
        projectPath: path.join(os.tmpdir(), randomAppName()),
      };
      const mockedTokenProvider: TokenProvider = {
        azureAccountProvider: new MockedAzureAccountProvider(),
        m365TokenProvider: new MockedM365Provider(),
      };
      const envInfoV3: v3.EnvInfoV3 = {
        envName: "dev",
        config: {},
        state: {
          solution: {},
          [BuiltInFeaturePluginNames.bot]: {
            botId: "mockBotId",
            botPassword: "mockPassword",
            siteEndpoint: "https://anything.azurewebsites.net",
            botChannelRegName: "anything",
          },
        },
      };
      sinon.stub(mockedTokenProvider.m365TokenProvider, "getAccessToken").resolves(ok("anything"));
      const fakeCreds = testUtils.generateFakeTokenCredentialsBase();
      sinon
        .stub(mockedTokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(fakeCreds);

      // Act
      const result = await botPlugin.configureResource(ctx, inputs, envInfoV3, mockedTokenProvider);

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
        _response: { status: 0 },
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
        _response: { status: 0 },
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

  describe("Test deploy V3", () => {
    beforeEach(() => {
      sinon.stub(LanguageStrategy, "localBuild").resolves();
      sinon.stub(utils, "zipAFolder").returns(new AdmZip().toBuffer());
      sinon.stub(AzureOperations, "listPublishingCredentials").resolves({
        _response: { status: 0 },
        publishingUserName: "test-username",
        publishingPassword: "test-password",
      });
      sinon.stub(AzureOperations, "zipDeployPackage").resolves("");
      sinon.stub(AzureOperations, "checkDeployStatus").resolves();
      sinon.stub(fs, "pathExists").resolves(true);
    });

    afterEach(async () => {
      sinon.restore();
    });

    it("Happy Path", async () => {
      const botPlugin = new NodeJSBotPluginV3();
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: "1232343534",
        solutionSettings: {
          name: BuiltInSolutionNames.azure,
          version: "3.0.0",
          capabilities: ["Bot"],
          hostType: "Azure",
          azureResources: [],
          activeResourcePlugins: [BuiltInFeaturePluginNames.bot],
        },
        programmingLanguage: "typescript",
      };
      const ctx = new MockedV2Context(projectSettings);
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.VSCode,
        projectPath: path.join(os.tmpdir(), randomAppName()),
      };
      const mockedTokenProvider: TokenProvider = {
        azureAccountProvider: new MockedAzureAccountProvider(),
        m365TokenProvider: new MockedM365Provider(),
      };
      const envInfoV3: v3.EnvInfoV3 = {
        envName: "dev",
        config: {},
        state: {
          solution: {},
          [BuiltInFeaturePluginNames.bot]: {
            botId: "mockBotId",
            botPassword: "mockPassword",
            siteEndpoint: "https://anything.azurewebsites.net",
            botChannelRegName: "anything",
            botWebAppResourceId:
              "/subscriptions/test-subscription/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-webapp",
          },
        },
      };
      sinon
        .stub(mockedTokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(testUtils.generateFakeTokenCredentialsBase());

      // Act
      const result = await botPlugin.deploy(ctx, inputs, envInfoV3, mockedTokenProvider);

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

  describe("Test provision V3 (local)", () => {
    afterEach(() => {
      sinon.restore();
    });

    beforeEach(() => {});

    it("Happy Path", async () => {
      const botPlugin = new NodeJSBotPluginV3();
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: "1232343534",
        solutionSettings: {
          name: BuiltInSolutionNames.azure,
          version: "3.0.0",
          capabilities: ["Bot"],
          hostType: "Azure",
          azureResources: [],
          activeResourcePlugins: [BuiltInFeaturePluginNames.bot],
        },
      };
      const ctx = new MockedV2Context(projectSettings);
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.VSCode,
        projectPath: path.join(os.tmpdir(), randomAppName()),
      };
      const mockedTokenProvider: TokenProvider = {
        azureAccountProvider: new MockedAzureAccountProvider(),
        m365TokenProvider: new MockedM365Provider(),
      };
      const envInfoV3: v3.EnvInfoV3 = {
        envName: "local",
        config: {},
        state: {
          solution: {},
          [BuiltInFeaturePluginNames.bot]: {},
        },
      };

      sinon.stub(mockedTokenProvider.m365TokenProvider, "getAccessToken").resolves(ok("anything"));
      const botAuthCreds = new BotAuthCredential();
      botAuthCreds.clientId = "anything";
      botAuthCreds.clientSecret = "anything";
      botAuthCreds.objectId = "anything";
      sinon.stub(AADRegistration, "registerAADAppAndGetSecretByGraph").resolves(botAuthCreds);
      sinon.stub(AppStudio, "createBotRegistration").resolves();

      // Act
      const result = await botPlugin.provisionResource(ctx, inputs, envInfoV3, mockedTokenProvider);

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

  describe("Test configureResource V3 (local)", () => {
    afterEach(() => {
      sinon.restore();
    });

    beforeEach(() => {});

    it("Happy Path", async () => {
      const botPlugin = new NodeJSBotPluginV3();
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: "1232343534",
        solutionSettings: {
          name: BuiltInSolutionNames.azure,
          version: "3.0.0",
          capabilities: ["Bot"],
          hostType: "Azure",
          azureResources: [],
          activeResourcePlugins: [BuiltInFeaturePluginNames.bot],
        },
      };
      const ctx = new MockedV2Context(projectSettings);
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.VSCode,
        projectPath: path.join(os.tmpdir(), randomAppName()),
      };
      const mockedTokenProvider: TokenProvider = {
        azureAccountProvider: new MockedAzureAccountProvider(),
        m365TokenProvider: new MockedM365Provider(),
      };
      const envInfoV3: v3.EnvInfoV3 = {
        envName: "dev",
        config: {},
        state: {
          solution: {},
          [BuiltInFeaturePluginNames.bot]: {
            botId: "mockBotId",
            botPassword: "mockPassword",
            siteEndpoint: "https://anything.azurewebsites.net",
            botChannelRegName: "anything",
          },
        },
      };
      // Arrange
      const pluginContext = testUtils.newPluginContext();
      sinon.stub(pluginContext.m365TokenProvider!, "getAccessToken").resolves(ok("anything"));
      sinon.stub(AppStudio, "updateMessageEndpoint").resolves();

      // Act
      const result = await botPlugin.configureResource(ctx, inputs, envInfoV3, mockedTokenProvider);

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
