// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Platform,
  ProjectSettings,
  Result,
  TeamsAppManifest,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as os from "os";
import * as path from "path";
import "reflect-metadata";
import * as uuid from "uuid";
import {
  BuiltInFeaturePluginNames,
  TeamsFxAzureSolutionNameV3,
} from "../../../src/plugins/solution/fx-solution/v3/constants";
import { deleteFolder, randomAppName } from "../../core/utils";
import { MockedV2Context } from "../solution/util";
import { MockFeaturePluginNames } from "./mockPlugins";
import sinon from "sinon";
import { Container } from "typedi";
import { AppStudioPluginV3 } from "../../../src/plugins/resource/appstudio/v3";
import {
  addFeature,
  getQuestionsForAddFeature,
} from "../../../src/plugins/solution/fx-solution/v3/addFeature";
import {
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceKeyVault,
  AzureSolutionQuestionNames,
  BotOptionItem,
  AzureResourceSQL,
} from "../../../src/plugins/solution/fx-solution/question";
describe("SolutionV3 - addFeature", () => {
  const sandbox = sinon.createSandbox();
  beforeEach(async () => {
    const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
    sandbox
      .stub<any, any>(appStudio, "loadManifest")
      .resolves(ok({ local: new TeamsAppManifest(), remote: new TeamsAppManifest() }));
    sandbox.stub<any, any>(appStudio, "saveManifest").resolves(ok({ local: {}, remote: {} }));
    sandbox.stub<any, any>(appStudio, "addCapabilities").resolves(ok(undefined));
  });
  afterEach(async () => {
    sandbox.restore();
  });
  it("getQuestionsForAddFeature", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: ["Tab"],
        hostType: "Azure",
        azureResources: [],
        activeResourcePlugins: [],
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    const res = await getQuestionsForAddFeature(ctx, inputs);
    assert.isTrue(res.isOk());
  });
  it("addFeature: frontend", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: [],
        hostType: "Azure",
        azureResources: [],
        activeResourcePlugins: [],
      },
    };
    const projectPath = path.join(os.tmpdir(), randomAppName());
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v3.SolutionAddFeatureInputs = {
      platform: Platform.VSCode,
      projectPath: projectPath,
      features: [BuiltInFeaturePluginNames.frontend],
    };
    const res = await addFeature(ctx, inputs);
    assert.isTrue(res.isOk());
    assert.deepEqual(projectSettings.solutionSettings, {
      name: TeamsFxAzureSolutionNameV3,
      version: "3.0.0",
      capabilities: ["Tab"],
      hostType: "Azure",
      azureResources: [],
      activeResourcePlugins: [BuiltInFeaturePluginNames.frontend],
    });
    deleteFolder(projectPath);
  });
  it("addFeature: bot", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: [],
        hostType: "Azure",
        azureResources: [],
        activeResourcePlugins: [],
      },
    };
    const projectPath = path.join(os.tmpdir(), randomAppName());
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v3.SolutionAddFeatureInputs = {
      platform: Platform.VSCode,
      projectPath: projectPath,
      features: [BuiltInFeaturePluginNames.bot],
      [AzureSolutionQuestionNames.Capabilities]: [BotOptionItem.id],
    };
    const res = await addFeature(ctx, inputs);
    assert.isTrue(res.isOk());
    assert.deepEqual(projectSettings.solutionSettings, {
      name: TeamsFxAzureSolutionNameV3,
      version: "3.0.0",
      capabilities: [BotOptionItem.id],
      hostType: "Azure",
      azureResources: [],
      activeResourcePlugins: [BuiltInFeaturePluginNames.bot, BuiltInFeaturePluginNames.identity],
    });
    deleteFolder(projectPath);
  });
  it("addFeature: identity", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: [],
        hostType: "Azure",
        azureResources: [],
        activeResourcePlugins: [],
      },
    };
    const projectPath = path.join(os.tmpdir(), randomAppName());
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v3.SolutionAddFeatureInputs = {
      platform: Platform.VSCode,
      projectPath: projectPath,
      features: [BuiltInFeaturePluginNames.identity],
    };
    const res = await addFeature(ctx, inputs);
    assert.isTrue(res.isOk());
    assert.deepEqual(projectSettings.solutionSettings, {
      name: TeamsFxAzureSolutionNameV3,
      version: "3.0.0",
      capabilities: [],
      hostType: "Azure",
      azureResources: [],
      activeResourcePlugins: [BuiltInFeaturePluginNames.identity],
    });
    deleteFolder(projectPath);
  });
  it("addFeature: function", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: [],
        hostType: "Azure",
        azureResources: [],
        activeResourcePlugins: [],
      },
      programmingLanguage: "javascript",
      defaultFunctionName: "testAPI",
    };
    const projectPath = path.join(os.tmpdir(), randomAppName());
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v3.SolutionAddFeatureInputs = {
      platform: Platform.VSCode,
      projectPath: projectPath,
      features: [BuiltInFeaturePluginNames.function],
    };
    const res = await addFeature(ctx, inputs);
    assert.isTrue(res.isOk());
    assert.deepEqual(projectSettings.solutionSettings, {
      name: TeamsFxAzureSolutionNameV3,
      version: "3.0.0",
      capabilities: [],
      hostType: "Azure",
      azureResources: [AzureResourceFunction.id],
      activeResourcePlugins: [
        BuiltInFeaturePluginNames.function,
        BuiltInFeaturePluginNames.identity,
      ],
    });
    deleteFolder(projectPath);
  });

  it("addFeature: keyvault", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: [],
        hostType: "Azure",
        azureResources: [],
        activeResourcePlugins: [],
      },
    };
    const projectPath = path.join(os.tmpdir(), randomAppName());
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v3.SolutionAddFeatureInputs = {
      platform: Platform.VSCode,
      projectPath: projectPath,
      features: [BuiltInFeaturePluginNames.keyVault],
    };
    const res = await addFeature(ctx, inputs);
    assert.isTrue(res.isOk());
    assert.deepEqual(projectSettings.solutionSettings, {
      name: TeamsFxAzureSolutionNameV3,
      version: "3.0.0",
      capabilities: [],
      hostType: "Azure",
      azureResources: [AzureResourceKeyVault.id],
      activeResourcePlugins: [
        BuiltInFeaturePluginNames.keyVault,
        BuiltInFeaturePluginNames.identity,
      ],
    });
    deleteFolder(projectPath);
  });
  it("addFeature: sql server", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: [],
        hostType: "Azure",
        azureResources: [],
        activeResourcePlugins: [],
      },
    };
    const projectPath = path.join(os.tmpdir(), randomAppName());
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v3.SolutionAddFeatureInputs = {
      platform: Platform.VSCode,
      projectPath: projectPath,
      features: [BuiltInFeaturePluginNames.sql],
    };
    const res = await addFeature(ctx, inputs);
    assert.isTrue(res.isOk());
    assert.deepEqual(projectSettings.solutionSettings, {
      name: TeamsFxAzureSolutionNameV3,
      version: "3.0.0",
      capabilities: [],
      hostType: "Azure",
      azureResources: [AzureResourceSQL.id],
      activeResourcePlugins: [BuiltInFeaturePluginNames.sql, BuiltInFeaturePluginNames.identity],
    });
    deleteFolder(projectPath);
  });
  it("addFeature: sql database", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: [],
        hostType: "Azure",
        azureResources: [AzureResourceSQL.id],
        activeResourcePlugins: [BuiltInFeaturePluginNames.sql, BuiltInFeaturePluginNames.identity],
      },
    };
    const projectPath = path.join(os.tmpdir(), randomAppName());
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v3.SolutionAddFeatureInputs = {
      platform: Platform.VSCode,
      projectPath: projectPath,
      features: [BuiltInFeaturePluginNames.sql],
    };
    const res = await addFeature(ctx, inputs);
    assert.isTrue(res.isOk());
    assert.deepEqual(projectSettings.solutionSettings, {
      name: TeamsFxAzureSolutionNameV3,
      version: "3.0.0",
      capabilities: [],
      hostType: "Azure",
      azureResources: [AzureResourceSQL.id],
      activeResourcePlugins: [BuiltInFeaturePluginNames.sql, BuiltInFeaturePluginNames.identity],
    });
    deleteFolder(projectPath);
  });
  it("addFeature: apim", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: TeamsFxAzureSolutionNameV3,
        version: "3.0.0",
        capabilities: [],
        hostType: "Azure",
        azureResources: [],
        activeResourcePlugins: [],
      },
    };
    const projectPath = path.join(os.tmpdir(), randomAppName());
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v3.SolutionAddFeatureInputs = {
      platform: Platform.VSCode,
      projectPath: projectPath,
      features: [BuiltInFeaturePluginNames.apim],
    };
    const res = await addFeature(ctx, inputs);
    assert.isTrue(res.isOk());
    assert.deepEqual(projectSettings.solutionSettings, {
      name: TeamsFxAzureSolutionNameV3,
      version: "3.0.0",
      capabilities: [],
      hostType: "Azure",
      azureResources: [AzureResourceApim.id],
      activeResourcePlugins: [BuiltInFeaturePluginNames.apim],
    });
    deleteFolder(projectPath);
  });
});
