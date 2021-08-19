// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "fs-extra";
import * as path from "path";

import { AzureSolutionSettings } from "@microsoft/teamsfx-api";
import { FunctionPlugin } from "../../../../../src";
import { ConstantString, mockSolutionUpdateArmTemplates, ResourcePlugins } from "../../util";
import { MockContext } from "../helper";

chai.use(chaiAsPromised);

describe("FunctionGenerateArmTemplates", () => {
  let functionPlugin: FunctionPlugin;
  let pluginContext: any;

  beforeEach(() => {
    functionPlugin = new FunctionPlugin();
    pluginContext = MockContext();
  });

  it("generate bicep arm templates", async () => {
    // Act
    const activeResourcePlugins = [
      ResourcePlugins.Aad,
      ResourcePlugins.SimpleAuth,
      ResourcePlugins.FrontendHosting,
      ResourcePlugins.Function,
    ];
    pluginContext.projectSettings!.solutionSettings = {
      name: "test_solution",
      version: "1.0.0",
      activeResourcePlugins: activeResourcePlugins,
    } as AzureSolutionSettings;
    const result = await functionPlugin.generateArmTemplates(pluginContext);

    // Assert
    const testModuleFileName = "function_test.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-function": {
          Modules: {
            functionProvision: {
              Path: `./${testModuleFileName}`,
            },
          },
        },
        "fx-resource-frontend-hosting": {
          Outputs: {
            endpoint: "frontend_hosting_test_endpoint",
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
        expectedResult.Modules!.functionProvision.Content,
        fs.readFileSync(expectedModuleFilePath, ConstantString.UTF8Encoding)
      );
      const expectedModuleSnippetFilePath = path.join(expectedBicepFileDirectory, "module.bicep");
      chai.assert.strictEqual(
        expectedResult.Orchestration.ModuleTemplate!.Content,
        fs.readFileSync(expectedModuleSnippetFilePath, ConstantString.UTF8Encoding)
      );
      const expectedParameterFilePath = path.join(expectedBicepFileDirectory, "input_param.bicep");
      chai.assert.strictEqual(
        expectedResult.Orchestration.ParameterTemplate!.Content,
        fs.readFileSync(expectedParameterFilePath, ConstantString.UTF8Encoding)
      );
      const expectedOutputFilePath = path.join(expectedBicepFileDirectory, "output.bicep");
      chai.assert.strictEqual(
        expectedResult.Orchestration.OutputTemplate!.Content,
        fs.readFileSync(expectedOutputFilePath, ConstantString.UTF8Encoding)
      );
      chai.assert.isUndefined(expectedResult.Orchestration.VariableTemplate);
    }
  });
});
