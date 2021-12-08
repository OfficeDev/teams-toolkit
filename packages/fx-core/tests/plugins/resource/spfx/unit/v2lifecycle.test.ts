// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Inputs,
  ok,
  Platform,
  Plugin,
  PluginContext,
  ProjectSettings,
  Result,
} from "@microsoft/teamsfx-api";
import { Context, DeploymentInputs, SolutionInputs } from "@microsoft/teamsfx-api/build/v2";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import * as os from "os";
import * as path from "path";
import "reflect-metadata";
import sinon from "sinon";
import { Container } from "typedi";
import * as uuid from "uuid";
import "../../../../../src/index";
import { SPFXQuestionNames } from "../../../../../src/index";
import { TabLanguage } from "../../../../../src/plugins/resource/frontend/resources/templateInfo";
import { SpfxPluginV2 } from "../../../../../src/plugins/resource/spfx/v2/index";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import { MockTools, randomAppName } from "../../../../core/utils";
import "../../../../../src/plugins/resource/spfx/v2/index";
import { mockDeployThatAlwaysSucceed } from "../../../solution/solution.deploy.test";

describe("SPFX V2", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  const pluginV1 = Container.get<Plugin>(ResourcePlugins.SpfxPlugin);
  const pluginV2 = Container.get<SpfxPluginV2>(ResourcePluginsV2.SpfxPlugin);
  const appName = randomAppName();
  const projectPath = path.resolve(os.tmpdir(), appName);
  const inputs: Inputs = {
    platform: Platform.VSCode,
    projectPath: projectPath,
  };
  const projectSettings: ProjectSettings = {
    appName: appName,
    projectId: uuid.v4(),
    version: "2",
    programmingLanguage: TabLanguage.JavaScript,
    solutionSettings: {
      name: "solution",
      activeResourcePlugins: [
        pluginV2.name,
        "fx-resource-aad-app-for-teams",
        "fx-resource-simple-auth",
      ],
    },
  };
  const context: Context = {
    userInteraction: tools.ui,
    logProvider: tools.logProvider,
    telemetryReporter: tools.telemetryReporter,
    cryptoProvider: tools.cryptoProvider,
    projectSetting: projectSettings,
    permissionRequestProvider: tools.permissionRequestProvider,
  };

  beforeEach(() => {
    // sandbox.stub<any, any>(defaultSolutionLoader, "loadSolution").resolves(mockSolution);
    // sandbox.stub<any, any>(defaultSolutionLoader, "loadGlobalSolutions").resolves([mockSolution]);
  });

  afterEach(async () => {
    sandbox.restore();
    // await fs.rmdir(projectPath, { recursive: true });
  });

  it("Check plugin name and displayName", async () => {
    assert.equal(pluginV1.name, pluginV2.name);
    assert.equal(pluginV1.displayName, pluginV2.displayName);
    assert.isTrue(pluginV1 === pluginV2.plugin);
  });

  it("getQuestionsForScaffolding - happy path", async () => {
    const res = await pluginV2.getQuestionsForScaffolding(context, inputs);
    assert.isTrue(res.isOk());
  });

  it("scaffoldSourceCode - happy path", async () => {
    pluginV1.postScaffold = async function (ctx: PluginContext): Promise<Result<any, FxError>> {
      return ok(undefined);
    };
    inputs[SPFXQuestionNames.webpart_name] = "helloworld";
    inputs[SPFXQuestionNames.framework_type] = "test";
    inputs[SPFXQuestionNames.framework_type] = "none";
    const res = await pluginV2.scaffoldSourceCode(context, inputs);
    assert.isTrue(res.isOk());
    await fs.rmdir(projectPath, { recursive: true });
  });

  it("deploy - happy path", async () => {
    const solutionInputs: SolutionInputs = {
      resourceNameSuffix: "",
      resourceGroupName: "",
      location: "",
      teamsAppTenantId: "",
      subscriptionId: "",
      tenantId: "xx",
    };
    const deployInputs: DeploymentInputs = { ...inputs, ...solutionInputs, projectPath: "./" };
    mockDeployThatAlwaysSucceed(pluginV1);
    const res = await pluginV2.deploy(
      context,
      deployInputs,
      { output: {}, secrets: {}, states: {} },
      tools.tokenProvider
    );
    assert.isTrue(res.isOk());
  });
});
