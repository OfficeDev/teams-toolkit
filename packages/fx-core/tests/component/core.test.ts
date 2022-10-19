import "mocha";

import { assert } from "chai";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as sinon from "sinon";

import {
  InputsWithProjectPath,
  ok,
  Platform,
  ResourceContextV3,
  Void,
} from "@microsoft/teamsfx-api";

import { TeamsfxCore } from "../../src/component/core";
import { deployUtils } from "../../src/component/deployUtils";
import * as EnvManager from "../../src/component/envManager";
import { TeamsBot } from "../../src/component/feature/bot/bot";
import * as question from "../../src/component/question";
import { AppManifest } from "../../src/component/resource/appManifest/appManifest";
import { AzureWebAppResource } from "../../src/component/resource/azureAppService/azureWebApp";
import { createContextV3 } from "../../src/component/utils";
import { newEnvInfoV3 } from "../../src/core/environment";
import * as FxCore from "../../src/core/FxCore";
import { setTools } from "../../src/core/globalVars";
import { MockTools, randomAppName } from "../core/utils";

describe("component core test", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("bot deploy happy path ", async () => {
    const tools = new MockTools();
    setTools(tools);
    const appName = `unittest${randomAppName()}`;
    const projectPath = path.join(os.homedir(), "TeamsApps", appName);
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      folder: path.join(projectPath, "tabs"),
      componentId: "teams-tab",
      "deploy-plugin": ["fx-resource-bot"],
    };
    const context = createContextV3();
    context.envInfo = newEnvInfoV3();
    context.tokenProvider = tools.tokenProvider;
    context.envInfo.state = {
      solution: {
        provisionSucceeded: true,
        needCreateResourceGroup: false,
        resourceGroupName: "mockRG",
        location: "eastAsia",
        resourceNameSuffix: "3bf854123",
        teamsAppTenantId: "mockTid",
        subscriptionId: "mockSid",
        subscriptionName: "mockName",
        tenantId: "mockAzureTid",
      },
      "teams-tab": {
        location: "centreUS",
        storageResourceId:
          "/subscriptions/mockSid/resourceGroups/jay-texas/providers/Microsoft.Storage/storageAccounts/testAccount",
        endpoint: "https://testaccount.azurewebsites.net",
      },
    };
    context.projectSetting = {
      appName: "AAA",
      projectId: "37495c20-9c8b-4db0-b43e-000000000000",
      version: "2.1.0",
      components: [
        {
          name: "teams-bot",
          hosting: "azure-web-app",
          deploy: true,
          capabilities: ["command-response"],
          build: true,
          folder: "bot",
          artifactFolder: "bot",
        },
      ],
      programmingLanguage: "javascript",
      solutionSettings: {
        name: "fx-solution-azure",
        version: "1.0.0",
        hostType: "Azure",
        azureResources: [],
        capabilities: ["Bot"],
        activeResourcePlugins: [
          "fx-resource-local-debug",
          "fx-resource-appstudio",
          "fx-resource-cicd",
          "fx-resource-api-connector",
          "fx-resource-bot",
          "fx-resource-identity",
        ],
      },
      pluginSettings: {
        "fx-resource-bot": {
          "host-type": "app-service",
          capabilities: ["command-response"],
        },
      },
    };

    // mock requisite
    sandbox.stub(question, "getQuestionsForDeployV3").resolves(ok(undefined));
    sandbox.stub(TeamsBot.prototype, "build").resolves(ok(undefined));
    sandbox.stub(AzureWebAppResource.prototype, "deploy").resolves(ok(undefined));
    sandbox.stub(deployUtils, "checkDeployAzureSubscription").resolves(ok(Void));
    sandbox.stub(deployUtils, "askForDeployConsent").resolves(ok(Void));

    const fxCore = new TeamsfxCore();
    const res = await fxCore.deploy(context as ResourceContextV3, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });

  it("init() should use projectId in inputs", async () => {
    const tools = new MockTools();
    setTools(tools);
    const appName = `unittest${randomAppName()}`;
    const projectPath = path.join(os.homedir(), "TeamsApps", appName);
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      folder: path.join(projectPath, "tabs"),
      "app-name": appName,
      projectId: "37495c20-9c8b-4db0-b43e-000000000000",
    };
    const context = createContextV3();
    context.tokenProvider = tools.tokenProvider;

    // mock requisite
    sandbox.stub(fs, "ensureDir");
    sandbox.stub(FxCore, "ensureBasicFolderStructure").resolves(ok(null));
    sandbox.stub(EnvManager, "createEnvWithName").resolves(ok(undefined));
    sandbox.stub(AppManifest.prototype, "init").resolves(ok(undefined));

    const fxCore = new TeamsfxCore();
    const res = await fxCore.init(context as ResourceContextV3, inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
    assert.strictEqual(context.projectSetting.projectId, "37495c20-9c8b-4db0-b43e-000000000000");
  });
});
