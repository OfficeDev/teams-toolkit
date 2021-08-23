// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import { AzureSolutionSettings, PluginContext } from "@microsoft/teamsfx-api";

import { ConstantString, mockSolutionUpdateArmTemplates, ResourcePlugins } from "../../util";
import { TeamsBot } from "../../../../../src";
import * as testUtils from "./utils";
import path from "path";
import fs from "fs-extra";

describe("Bot Generates Arm Templates", () => {
  let botPlugin: TeamsBot;

  beforeEach(() => {
    botPlugin = new TeamsBot();
  });

  it("generate bicep arm templates: only bot", async () => {
    // Arrange
    const activeResourcePlugins = [ResourcePlugins.Aad, ResourcePlugins.Bot];
    const pluginContext: PluginContext = testUtils.newPluginContext();
    const azureSolutionSettings = pluginContext.projectSettings!
      .solutionSettings! as AzureSolutionSettings;
    azureSolutionSettings.activeResourcePlugins = activeResourcePlugins;
    pluginContext.projectSettings!.solutionSettings = azureSolutionSettings;

    // Act
    const result = await botPlugin.generateArmTemplates(pluginContext);

    // Assert
    const testModuleFileName = "bot.onlybot.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-bot": {
          Modules: {
            botProvision: {
              Path: `./${testModuleFileName}`,
            },
          },
        },
      },
    };
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      const compiledResult = mockSolutionUpdateArmTemplates(
        mockedSolutionDataContext,
        result.value
      );

      const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
      const expectedModuleFilePath = path.join(expectedBicepFileDirectory, testModuleFileName);
      chai.assert.strictEqual(
        compiledResult.Modules!.botProvision.Content,
        fs.readFileSync(expectedModuleFilePath, ConstantString.UTF8Encoding)
      );
      const expectedModuleSnippetFilePath = path.join(
        expectedBicepFileDirectory,
        "module.onlybot.bicep"
      );
      chai.assert.strictEqual(
        compiledResult.Orchestration.ModuleTemplate!.Content,
        fs.readFileSync(expectedModuleSnippetFilePath, ConstantString.UTF8Encoding)
      );
      const expectedParameterFilePath = path.join(expectedBicepFileDirectory, "param.bicep");
      chai.assert.strictEqual(
        compiledResult.Orchestration.ParameterTemplate!.Content,
        fs.readFileSync(expectedParameterFilePath, ConstantString.UTF8Encoding)
      );
      const expectedOutputFilePath = path.join(expectedBicepFileDirectory, "output.bicep");
      chai.assert.strictEqual(
        compiledResult.Orchestration.OutputTemplate!.Content,
        fs.readFileSync(expectedOutputFilePath, ConstantString.UTF8Encoding)
      );
      const expectedParameterJsonFilePath = path.join(
        expectedBicepFileDirectory,
        "parameters.json"
      );
      chai.assert.strictEqual(
        JSON.stringify(
          compiledResult.Orchestration.ParameterTemplate!.ParameterJson,
          undefined,
          2
        ) + "\n",
        fs.readFileSync(expectedParameterJsonFilePath, ConstantString.UTF8Encoding)
      );
      chai.assert.isUndefined(compiledResult.Orchestration.VariableTemplate);
    }
  });

  it("generate bicep arm templates: bot with all resource plugins enabled", async () => {
    // Arrange
    const activeResourcePlugins = [
      ResourcePlugins.Aad,
      ResourcePlugins.SimpleAuth,
      ResourcePlugins.FrontendHosting,
      ResourcePlugins.Bot,
      ResourcePlugins.Function,
      ResourcePlugins.AzureSQL,
      ResourcePlugins.Identity,
    ];
    const pluginContext: PluginContext = testUtils.newPluginContext();
    const azureSolutionSettings = pluginContext.projectSettings!
      .solutionSettings! as AzureSolutionSettings;
    azureSolutionSettings.activeResourcePlugins = activeResourcePlugins;
    pluginContext.projectSettings!.solutionSettings = azureSolutionSettings;

    // Act
    const result = await botPlugin.generateArmTemplates(pluginContext);

    // Assert
    const testModuleFileName = "bot.all.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-aad-app-for-teams": {},
        "fx-resource-frontend-hosting": {},
        "fx-resource-simple-auth": {},
        "fx-resource-bot": {
          Modules: {
            botProvision: {
              Path: `./${testModuleFileName}`,
            },
          },
        },
        "fx-resource-function": {
          Outputs: {
            functionEndpoint: "test_function_endpoint",
          },
        },
        "fx-resource-azure-sql": {
          Outputs: {
            databaseName: "test_sql_database_name",
            sqlEndpoint: "test_sql_endpoint",
          },
        },
        "fx-resource-identity": {
          Outputs: {
            identityId: "test_identity_id",
            identityName: "test_identity_name",
          },
        },
      },
    };
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      const compiledResult = mockSolutionUpdateArmTemplates(
        mockedSolutionDataContext,
        result.value
      );

      const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
      const expectedModuleFilePath = path.join(expectedBicepFileDirectory, testModuleFileName);
      chai.assert.strictEqual(
        compiledResult.Modules!.botProvision.Content,
        fs.readFileSync(expectedModuleFilePath, ConstantString.UTF8Encoding)
      );
      const expectedModuleSnippetFilePath = path.join(
        expectedBicepFileDirectory,
        "module.all.bicep"
      );
      chai.assert.strictEqual(
        compiledResult.Orchestration.ModuleTemplate!.Content,
        fs.readFileSync(expectedModuleSnippetFilePath, ConstantString.UTF8Encoding)
      );
      const expectedParameterFilePath = path.join(expectedBicepFileDirectory, "param.bicep");
      chai.assert.strictEqual(
        compiledResult.Orchestration.ParameterTemplate!.Content,
        fs.readFileSync(expectedParameterFilePath, ConstantString.UTF8Encoding)
      );
      const expectedOutputFilePath = path.join(expectedBicepFileDirectory, "output.bicep");
      chai.assert.strictEqual(
        compiledResult.Orchestration.OutputTemplate!.Content,
        fs.readFileSync(expectedOutputFilePath, ConstantString.UTF8Encoding)
      );
      const expectedParameterJsonFilePath = path.join(
        expectedBicepFileDirectory,
        "parameters.json"
      );
      chai.assert.strictEqual(
        JSON.stringify(
          compiledResult.Orchestration.ParameterTemplate!.ParameterJson,
          undefined,
          2
        ) + "\n",
        fs.readFileSync(expectedParameterJsonFilePath, ConstantString.UTF8Encoding)
      );
      chai.assert.isUndefined(compiledResult.Orchestration.VariableTemplate);
    }
  });
});
