import "mocha";
import {
  InputsWithProjectPath,
  ok,
  Platform,
  ResourceContextV3,
  Void,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import { createContextV3 } from "../../src/component/utils";
import { newEnvInfoV3, setTools } from "../../src";
import * as os from "os";
import { MockTools, randomAppName } from "../core/utils";
import { assert } from "chai";
import { TeamsfxCore } from "../../src/component/core";
import * as sinon from "sinon";
import * as question from "../../src/component/questionV3";
import { TeamsBot } from "../../src/component/feature/bot";
import { AzureWebAppResource } from "../../src/component/resource/azureAppService/azureWebApp";
import { deployUtils } from "../../src/component/deployUtils";

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
});
