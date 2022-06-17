// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok, Platform, ProjectSettings, TokenProvider, v2, v3, Void } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as uuid from "uuid";
import {
  BuiltInFeaturePluginNames,
  BuiltInSolutionNames,
} from "../../../src/plugins/solution/fx-solution/v3/constants";
import { getQuestionsForUserTask } from "../../../src/plugins/solution/fx-solution/v3/userTask";
import { MockedM365Provider, MockedAzureAccountProvider, MockedV2Context } from "../solution/util";
import * as path from "path";
import * as os from "os";
import { deleteFolder, MockM365TokenProvider, randomAppName } from "../../core/utils";
import { Container } from "typedi";
import { TeamsFxAzureSolution } from "../../../src/plugins/solution/fx-solution/v3/solution";
import {
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceKeyVault,
  AzureResourceSQL,
  AzureSolutionQuestionNames,
  BotOptionItem,
  MessageExtensionItem,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import sinon from "sinon";
import { AppStudioPluginV3 } from "../../../src/plugins/resource/appstudio/v3";

describe("SolutionV3 - executeUserTask", () => {
  const solution = Container.get<TeamsFxAzureSolution>(BuiltInSolutionNames.azure);
  const sandbox = sinon.createSandbox();
  beforeEach(async () => {
    const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
    sandbox.stub<any, any>(appStudio, "addCapabilities").resolves(ok(Void));
    sandbox.stub<any, any>(appStudio, "updateCapability").resolves(ok(Void));
  });
  afterEach(async () => {
    sandbox.restore();
  });
  function mockPlugin(pluginName: string) {
    const plugin = Container.get<v3.PluginV3>(pluginName);
    if (plugin.addInstance) sandbox.stub<any, any>(plugin, "addInstance").resolves(ok([]));
    if (plugin.generateBicep) sandbox.stub<any, any>(plugin, "generateBicep").resolves(ok([]));
    if (plugin.updateBicep) sandbox.stub<any, any>(plugin, "updateBicep").resolves(ok([]));
    if (plugin.generateCode) sandbox.stub<any, any>(plugin, "generateCode").resolves(ok(Void));
  }
  it("getQuestionsForAddResource", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: BuiltInSolutionNames.azure,
        version: "3.0.0",
        capabilities: [],
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
    const mockedTokenProvider: TokenProvider = {
      azureAccountProvider: new MockedAzureAccountProvider(),
      m365TokenProvider: new MockedM365Provider(),
    };
    const res = await getQuestionsForUserTask(
      ctx,
      inputs,
      { namespace: "", method: "addResource" },
      { envName: "dev", config: {}, state: { solution: {} } },
      mockedTokenProvider
    );
    assert.isTrue(res.isOk());
  });
  it("addCapability", async () => {
    mockPlugin(BuiltInFeaturePluginNames.aad);
    mockPlugin(BuiltInFeaturePluginNames.frontend);
    mockPlugin(BuiltInFeaturePluginNames.bot);
    mockPlugin(BuiltInFeaturePluginNames.identity);
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: BuiltInSolutionNames.azure,
        version: "3.0.0",
        capabilities: [],
        hostType: "Azure",
        azureResources: [],
        activeResourcePlugins: [],
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
      capabilities: [TabOptionItem.id, BotOptionItem.id, MessageExtensionItem.id],
    };
    const res = await solution.addCapability(ctx, inputs);
    assert.isTrue(res.isOk());
  });

  it("addResource", async () => {
    mockPlugin(BuiltInFeaturePluginNames.sql);
    mockPlugin(BuiltInFeaturePluginNames.function);
    mockPlugin(BuiltInFeaturePluginNames.keyVault);
    mockPlugin(BuiltInFeaturePluginNames.identity);
    mockPlugin(BuiltInFeaturePluginNames.apim);
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: BuiltInSolutionNames.azure,
        version: "3.0.0",
        capabilities: [],
        hostType: "Azure",
        azureResources: [],
        activeResourcePlugins: [],
      },
    };
    const ctx = new MockedV2Context(projectSettings);
    const inputs: v2.InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
      [AzureSolutionQuestionNames.AddResources]: [
        AzureResourceSQL.id,
        AzureResourceApim.id,
        AzureResourceFunction.id,
        AzureResourceKeyVault.id,
      ],
    };
    const res = await solution.addResource(ctx, inputs);
    assert.isTrue(res.isOk());
  });
});
