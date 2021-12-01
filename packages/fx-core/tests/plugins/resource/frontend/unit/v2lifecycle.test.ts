// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, Platform, Plugin, ProjectSettings } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import * as os from "os";
import * as path from "path";
import "reflect-metadata";
import sinon from "sinon";
import { Container } from "typedi";
import * as uuid from "uuid";
import { ArmTemplateResult } from "../../../../../src/common/armInterface";
import "../../../../../src/index";
import { TabLanguage } from "../../../../../src/plugins/resource/frontend/resources/templateInfo";
import { FrontendPluginV2 } from "../../../../../src/plugins/resource/frontend/v2/index";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import { MockTools, randomAppName } from "../../../../core/utils";
import {
  ConstantString,
  mockSolutionGenerateArmTemplates,
  mockSolutionUpdateArmTemplates,
} from "../../util";

describe("Frontend hosting V2", () => {
  const sandbox = sinon.createSandbox();

  const tools = new MockTools();
  const pluginV2 = Container.get<FrontendPluginV2>(ResourcePluginsV2.FrontendPlugin);
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
    const pluginV1 = Container.get<Plugin>(ResourcePlugins.FrontendPlugin);
    const pluginV2 = Container.get<FrontendPluginV2>(ResourcePluginsV2.FrontendPlugin);
    assert.equal(pluginV1.name, pluginV2.name);
    assert.equal(pluginV1.displayName, pluginV2.displayName);
    assert.isTrue(pluginV1 === pluginV2.plugin);
  });

  it("scaffoldSourceCode - happy path", async () => {
    /**
     * frontend scaffold depends on:
     *  ctx.projectSettings.solutionSettings.activeResourcePlugins
     *  ctx.projectSettings.programmingLanguage
     *  ctx.root (inputs.projectPath)
     */
    const res = await pluginV2.scaffoldSourceCode(context, inputs);

    assert.isTrue(res.isOk());

    assert.isTrue(fs.pathExistsSync(path.join(projectPath, "tabs")));
    assert.isTrue(fs.pathExistsSync(path.join(projectPath, "tabs", "src")));
    assert.isTrue(fs.pathExistsSync(path.join(projectPath, "tabs", "package.json")));

    await fs.rmdir(projectPath, { recursive: true });
  });

  it("Scaffold - happy path", async () => {
    const result = await pluginV2.generateResourceTemplate(context, inputs);
    // Assert
    const testModuleFileName = "frontendProvision.result.bicep";
    const mockedSolutionDataContext = {
      Plugins: [pluginV2.name, "fx-resource-aad-app-for-teams", "fx-resource-simple-auth"],
      PluginOutput: {
        "fx-resource-frontend-hosting": {
          Provision: {
            frontendHosting: {
              ProvisionPath: `./${testModuleFileName}`,
            },
          },
        },
      },
    };
    assert.isTrue(result.isOk());
    if (result.isOk()) {
      const expectedResult = mockSolutionGenerateArmTemplates(
        mockedSolutionDataContext,
        result.value.template as ArmTemplateResult
      );

      const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
      const expectedModuleFilePath = path.join(expectedBicepFileDirectory, testModuleFileName);
      const moduleFile = await fs.readFile(expectedModuleFilePath, ConstantString.UTF8Encoding);
      assert.strictEqual(expectedResult.Provision!.Modules!.frontendHosting, moduleFile);
      const expectedModuleSnippetFilePath = path.join(
        expectedBicepFileDirectory,
        "provision.result.bicep"
      );
      const OrchestrationConfigFile = await fs.readFile(
        expectedModuleSnippetFilePath,
        ConstantString.UTF8Encoding
      );
      assert.strictEqual(expectedResult.Provision!.Orchestration, OrchestrationConfigFile);
      assert.isNotNull(expectedResult.Provision!.Reference);
      assert.isUndefined(expectedResult.Parameters);
    }
  });
});
