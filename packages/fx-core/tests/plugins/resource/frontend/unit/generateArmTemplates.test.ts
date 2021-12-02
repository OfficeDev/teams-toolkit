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
import {
  ConstantString,
  mockSolutionGenerateArmTemplates,
  mockSolutionUpdateArmTemplates,
  ResourcePlugins,
} from "../../util";

chai.use(chaiAsPromised);

describe("FrontendGenerateArmTemplates", () => {
  let frontendPlugin: FrontendPlugin;

  beforeEach(() => {
    frontendPlugin = new FrontendPlugin();
  });

  it("generate bicep arm templates", async () => {
    // Act
    const activeResourcePlugins = [
      ResourcePlugins.Aad,
      ResourcePlugins.SimpleAuth,
      ResourcePlugins.FrontendHosting,
    ];
    const pluginContext: PluginContext = TestHelper.getFakePluginContext();
    pluginContext.projectSettings!.solutionSettings = {
      name: "test_solution",
      version: "1.0.0",
      activeResourcePlugins: activeResourcePlugins,
    } as AzureSolutionSettings;
    const result = await frontendPlugin.generateArmTemplates(pluginContext);

    // Assert
    const testModuleFileName = "frontendProvision.result.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
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
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      const expectedResult = mockSolutionGenerateArmTemplates(
        mockedSolutionDataContext,
        result.value
      );

      const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
      const expectedModuleFilePath = path.join(expectedBicepFileDirectory, testModuleFileName);
      const moduleFile = await fs.readFile(expectedModuleFilePath, ConstantString.UTF8Encoding);
      chai.assert.strictEqual(expectedResult.Provision!.Modules!.frontendHosting, moduleFile);
      const expectedModuleSnippetFilePath = path.join(
        expectedBicepFileDirectory,
        "provision.result.bicep"
      );
      const OrchestrationConfigFile = await fs.readFile(
        expectedModuleSnippetFilePath,
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(expectedResult.Provision!.Orchestration, OrchestrationConfigFile);
      chai.assert.isNotNull(expectedResult.Provision!.Reference);
      chai.assert.isUndefined(expectedResult.Parameters);
    }
  });
});
