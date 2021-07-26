// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "fs-extra";
import * as path from "path";

import { AzureSolutionSettings, PluginContext } from "@microsoft/teamsfx-api";
import { TestHelper } from "../helper";
import { FrontendPlugin } from "../../../../../src";
import { mockSolutionUpdateArmTemplates } from "../../util";
import {
  DependentPluginInfo,
  FrontendPluginInfo,
} from "../../../../../src/plugins/resource/frontend/constants";

chai.use(chaiAsPromised);

describe("FrontendGenerateArmTemplates", () => {
  let frontendPlugin: FrontendPlugin;

  beforeEach(() => {
    frontendPlugin = new FrontendPlugin();
  });

  it("generate bicep arm templates", async () => {
    // Act
    const activeResourcePlugins = [
      FrontendPluginInfo.PluginName,
      DependentPluginInfo.AADPluginName,
      DependentPluginInfo.RuntimePluginName,
    ];
    const pluginContext: PluginContext = TestHelper.getFakePluginContext();
    pluginContext.projectSettings!.solutionSettings = {
      name: "test_solution",
      version: "1.0.0",
      activeResourcePlugins: activeResourcePlugins,
    } as AzureSolutionSettings;
    const result = await frontendPlugin.generateArmTemplates(pluginContext);

    // Assert
    const testModuleFileName = "frontend_hosting_test.bicep";
    const mockedSolutionDataContext = {
      plugins: activeResourcePlugins,
      "fx-resource-frontend-hosting": {
        modules: {
          frontendHostingProvision: {
            path: `./${testModuleFileName}`,
          },
        },
      },
    };
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      const expectedResult = mockSolutionUpdateArmTemplates(
        mockedSolutionDataContext,
        result.value
      );

      const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
      const expectedModuleFilePath = path.join(expectedBicepFileDirectory, testModuleFileName);
      chai.assert.strictEqual(
        expectedResult.Modules.frontendHostingProvision.Content,
        fs.readFileSync(expectedModuleFilePath, "utf-8")
      );
      const expectedModuleSnippetFilePath = path.join(expectedBicepFileDirectory, "module.bicep");
      chai.assert.strictEqual(
        expectedResult.Orchestration.ModuleTemplate.Content,
        fs.readFileSync(expectedModuleSnippetFilePath, "utf-8")
      );
      const expectedParameterFilePath = path.join(expectedBicepFileDirectory, "input_param.bicep");
      chai.assert.strictEqual(
        expectedResult.Orchestration.ParameterTemplate!.Content,
        fs.readFileSync(expectedParameterFilePath, "utf-8")
      );
      const expectedOutputFilePath = path.join(expectedBicepFileDirectory, "output.bicep");
      chai.assert.strictEqual(
        expectedResult.Orchestration.OutputTemplate!.Content,
        fs.readFileSync(expectedOutputFilePath, "utf-8")
      );
      chai.assert.isUndefined(expectedResult.Orchestration.VariableTemplate);
      chai.assert.isUndefined(expectedResult.Orchestration.ParameterTemplate!.ParameterFile);
    }
  });
});
