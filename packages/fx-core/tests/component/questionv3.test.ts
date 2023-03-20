// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import { assert } from "chai";
import sinon from "sinon";
import {
  getQuestionsForAddFeatureSubCommand,
  getQuestionsForAddFeatureV3,
  getQuestionsForAddResourceV3,
  getQuestionsForDeployV3,
  getQuestionsForValidateManifest,
  getQuestionsForValidateAppPackage,
  getQuestionsForCreateAppPackage,
  getQuestionsForUpdateTeamsApp,
  FeatureId,
  InitDebugProceedQuestion,
  getQuestionsForAddWebpart,
  spfxFolderQuestion,
} from "../../src/component/question";
import {
  ApiConnectionOptionItem,
  AzureResourceApimNewUI,
  AzureResourceFunctionNewUI,
  AzureResourceKeyVaultNewUI,
  AzureResourceSQLNewUI,
  BotNewUIOptionItem,
  CommandAndResponseOptionItem,
  MessageExtensionNewUIItem,
  NotificationOptionItem,
  SingleSignOnOptionItem,
  TabNewUIOptionItem,
  TabNonSsoItem,
  WorkflowOptionItem,
} from "../../src/component/constants";
import { manifestUtils } from "../../src/component/resource/appManifest/utils/ManifestUtils";
import {
  Inputs,
  InputsWithProjectPath,
  ok,
  OptionItem,
  Platform,
  SingleSelectQuestion,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import { createContextV3 } from "../../src/component/utils";
import { newEnvInfoV3 } from "../../src/core/environment";
import "../../src/component/core";
import * as tools from "../../src/common/tools";
import { ComponentNames } from "../../src/component/constants";
import mockedEnv, { RestoreFn } from "mocked-env";
describe("question for v3", () => {
  let mockedEnvRestore: RestoreFn;
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
  });
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });
  it("getQuestionsForDeployV3 - CLI_HELP", async () => {
    const context = createContextV3();
    const envInfo = newEnvInfoV3();
    envInfo.state.solution = {
      provisionSucceeded: true,
    };
    const inputs: InputsWithProjectPath = {
      platform: Platform.CLI_HELP,
      projectPath: ".",
    };
    const res = await getQuestionsForDeployV3(context, inputs);
    assert.isTrue(res.isOk());
  });
  it("getQuestionsForDeployV3 - VS Code", async () => {
    const projectSettings = {
      appName: "hj070701",
      projectId: "112233",
      version: "2.1.0",
      isFromSample: false,
      components: [
        {
          name: "teams-bot",
          hosting: "azure-function",
          capabilities: ["notification"],
          build: true,
          deploy: true,
          provision: true,
          folder: "bot",
        },
        {
          name: "azure-function",
          connections: ["teams-bot"],
        },
        {
          name: "bot-service",
          provision: true,
        },
        {
          name: "apim",
          deploy: true,
          provision: true,
        },
      ],
      programmingLanguage: "javascript",
    };
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const context = createContextV3(projectSettings);
    const envInfo = newEnvInfoV3();
    envInfo.state.solution = {
      provisionSucceeded: true,
    };
    const res = await getQuestionsForDeployV3(context, inputs, envInfo);
    assert.isTrue(res.isOk());
  });

  it("getQuestionsForAddFeatureV3 - CLI_HELP", async () => {
    const context = createContextV3();
    const inputs: InputsWithProjectPath = {
      platform: Platform.CLI_HELP,
      projectPath: ".",
    };
    const res = await getQuestionsForAddFeatureV3(context, inputs);
    assert.isTrue(res.isOk());
  });

  it("getQuestionsForAddFeatureV3 - VS Code", async () => {
    const manifest = new TeamsAppManifest();
    manifest.staticTabs = [];
    manifest.bots = [];
    manifest.composeExtensions = [];
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    const projectSettings = {
      appName: "hj070701",
      projectId: "112233",
      version: "2.1.0",
      isFromSample: false,
      components: [
        {
          name: "teams-bot",
          hosting: "azure-function",
          capabilities: ["notification"],
          build: true,
          folder: "bot",
        },
        {
          name: "azure-function",
          connections: ["teams-bot"],
        },
        {
          name: "bot-service",
          provision: true,
        },
      ],
      programmingLanguage: "javascript",
    };
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const context = createContextV3(projectSettings);
    const res = await getQuestionsForAddFeatureV3(context, inputs);
    assert.isTrue(res.isOk());
  });

  it("getQuestionsForAddFeatureV3 for tab - VS Code", async () => {
    const manifest = new TeamsAppManifest();
    manifest.staticTabs = [];
    manifest.bots = [];
    manifest.composeExtensions = [];
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    const projectSettings = {
      appName: "tabApp",
      projectId: "112233",
      version: "2.1.0",
      isFromSample: false,
      components: [
        {
          name: "teams-tab",
          hosting: "azure-storage",
          build: true,
          folder: "tabs",
        },
        {
          name: "azure-storage",
          scenario: "Tab",
          provision: true,
        },
        {
          name: "identity",
          provision: true,
        },
      ],
      programmingLanguage: "typescript",
    };
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const context = createContextV3(projectSettings);
    const res = await getQuestionsForAddFeatureV3(context, inputs);
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      const node = res.value;
      assert.isTrue(
        node &&
          node.data &&
          node.data.type === "singleSelect" &&
          node.data.staticOptions.length === 11,
        "option item count check"
      );
      if (node && node.data && node.data.type === "singleSelect") {
        const options = (node.data as SingleSelectQuestion).staticOptions as OptionItem[];
        assert.deepEqual(
          options,
          [
            NotificationOptionItem(),
            CommandAndResponseOptionItem(),
            WorkflowOptionItem(),
            TabNonSsoItem(),
            BotNewUIOptionItem(),
            MessageExtensionNewUIItem(),
            AzureResourceFunctionNewUI,
            AzureResourceApimNewUI,
            AzureResourceSQLNewUI,
            AzureResourceKeyVaultNewUI,
            SingleSignOnOptionItem,
          ],
          "option item should match"
        );
      }
    }
  });

  it("getQuestionsForAddFeatureV3 for SPFx - VS Code", async () => {
    const manifest = new TeamsAppManifest();
    manifest.staticTabs = [];
    manifest.bots = [];
    manifest.composeExtensions = [];
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    sandbox.stub<any, any>(tools, "canAddCICDWorkflows").resolves(true);
    const projectSettings = {
      appName: "hj070701",
      projectId: "112233",
      version: "2.1.0",
      isFromSample: false,
      components: [],
      programmingLanguage: "javascript",
      solutionSettings: {
        name: "fx-solution-azure",
        version: "1.0.0",
        hostType: "SPFx",
        azureResources: [],
        capabilities: ["Tab"],
        activeResourcePlugins: [
          "fx-resource-spfx",
          "fx-resource-local-debug",
          "fx-resource-appstudio",
        ],
      },
    };
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const context = createContextV3(projectSettings);
    const res = await getQuestionsForAddFeatureV3(context, inputs);
    assert.isTrue(res.isOk());
  });

  it("getQuestionsForAddResourceV3 - CLI_HELP", async () => {
    const context = createContextV3();
    const inputs: InputsWithProjectPath = {
      platform: Platform.CLI_HELP,
      projectPath: ".",
    };
    const res = await getQuestionsForAddResourceV3(context, inputs);
    assert.isTrue(res.isOk());
  });
  it("getQuestionsForAddResourceV3 - VS Code", async () => {
    const projectSettings = {
      appName: "hj070701",
      projectId: "112233",
      version: "2.1.0",
      isFromSample: false,
      components: [
        {
          name: "teams-bot",
          hosting: "azure-function",
          capabilities: ["notification"],
          build: true,
          folder: "bot",
        },
        {
          name: "azure-function",
          connections: ["teams-bot"],
        },
        {
          name: "bot-service",
          provision: true,
        },
      ],
      programmingLanguage: "javascript",
    };
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const context = createContextV3(projectSettings);
    const res = await getQuestionsForAddResourceV3(context, inputs);
    assert.isTrue(res.isOk());
  });
  it("getQuestionsForAddFeatureSubCommand", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
    };
    for (const feature in FeatureId) {
      const res = await getQuestionsForAddFeatureSubCommand(feature as FeatureId, inputs);
      assert.isTrue(res.isOk());
    }
  });
  it("getQuestionsForAddFeatureV3 for Message Extension - VS Code", async () => {
    const manifest = new TeamsAppManifest();
    manifest.staticTabs = [];
    manifest.bots = [];
    manifest.composeExtensions = [{} as any];
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
    const projectSettings = {
      appName: "meApp",
      projectId: "112233",
      version: "2.1.0",
      isFromSample: false,
      components: [
        {
          name: ComponentNames.TeamsBot,
          hosting: ComponentNames.AzureWebApp,
          folder: "bot",
        },
        {
          name: ComponentNames.AzureWebApp,
          scenario: "Bot",
        },
        { name: ComponentNames.BotService, provision: true },
        {
          name: "identity",
          provision: true,
        },
      ],
      programmingLanguage: "typescript",
    };
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const context = createContextV3(projectSettings);
    const res = await getQuestionsForAddFeatureV3(context, inputs);
    assert.isTrue(res.isOk());
    const expectedOptions = [
      TabNewUIOptionItem(),
      TabNonSsoItem(),
      BotNewUIOptionItem(),
      AzureResourceFunctionNewUI,
      AzureResourceApimNewUI,
      AzureResourceSQLNewUI,
      AzureResourceKeyVaultNewUI,
      SingleSignOnOptionItem,
      ApiConnectionOptionItem,
    ];
    if (res.isOk()) {
      const node = res.value;
      assert.isTrue(
        node &&
          node.data &&
          node.data.type === "singleSelect" &&
          node.data.staticOptions.length === expectedOptions.length,
        "option item count check"
      );
      if (node && node.data && node.data.type === "singleSelect") {
        const options = (node.data as SingleSelectQuestion).staticOptions as OptionItem[];
        assert.deepEqual(options, expectedOptions, "option item should match");
      }
    }
  });

  it("getQuestionsForAddWebpart", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "./test",
    };

    const res = getQuestionsForAddWebpart(inputs);

    assert.isTrue(res.isOk());
  });

  it("spfxFolderQuestion", () => {
    const projectDir = "\\test";

    const res = (spfxFolderQuestion() as any).default({ projectPath: projectDir });

    assert.equal(res, "\\test/src");
  });

  it("InitDebugProceedQuestion.title", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
      editor: "vsc",
      projectPath: ".",
    };
    const res1 = await (InitDebugProceedQuestion() as any).title(inputs);
    inputs.editor = "vs";
    const res2 = await (InitDebugProceedQuestion() as any).title(inputs);
    assert.isDefined(res1);
    assert.isDefined(res2);
  });

  it("validate manifest question", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      validateMethod: "validateAgainstSchema",
    };
    const nodeRes = await getQuestionsForValidateManifest(inputs);
    assert.isTrue(nodeRes.isOk());
  });

  it("validate app package question", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      validateMethod: "validateAgainstAppPackage",
    };
    const nodeRes = await getQuestionsForValidateAppPackage(inputs);
    assert.isTrue(nodeRes.isOk());
  });

  it("create app package question", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const nodeRes = await getQuestionsForCreateAppPackage(inputs);
    assert.isTrue(nodeRes.isOk());
  });

  it("update Teams app question", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const nodeRes = await getQuestionsForUpdateTeamsApp(inputs);
    assert.isTrue(nodeRes.isOk());
  });
});
