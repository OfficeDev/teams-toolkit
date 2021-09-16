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

  it("generate bicep arm templates: new bot", async () => {
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
    const provisionModuleFileName = "botProvision.newBot.bicep";
    const configurationModuleFileName = "botConfiguration.newBot.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-bot": {
          Modules: {
            botProvision: {
              Path: `./${provisionModuleFileName}`,
            },
            botConfiguration: {
              Path: `./${configurationModuleFileName}`,
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
      chai.assert.strictEqual(
        compiledResult.Modules!.botProvision.Content,
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, provisionModuleFileName),
          ConstantString.UTF8Encoding
        )
      );
      chai.assert.strictEqual(
        compiledResult.Modules!.botConfiguration.Content,
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, configurationModuleFileName),
          ConstantString.UTF8Encoding
        )
      );
      chai.assert.strictEqual(
        compiledResult.Orchestration.ModuleTemplate!.Content,
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, "module.newBot.bicep"),
          ConstantString.UTF8Encoding
        )
      );
      chai.assert.strictEqual(
        compiledResult.Orchestration.ParameterTemplate!.Content,
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, "param.bicep"),
          ConstantString.UTF8Encoding
        )
      );
      chai.assert.strictEqual(
        compiledResult.Orchestration.OutputTemplate!.Content,
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, "output.bicep"),
          ConstantString.UTF8Encoding
        )
      );
      chai.assert.strictEqual(
        JSON.stringify(
          compiledResult.Orchestration.ParameterTemplate!.ParameterJson,
          undefined,
          2
        ) + "\n",
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, "parameters.json"),
          ConstantString.UTF8Encoding
        )
      );
      chai.assert.isUndefined(compiledResult.Orchestration.VariableTemplate);
    }
  });

  it("generate bicep arm templates: new bot with all resource plugins enabled", async () => {
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
    const testProvisionModuleFileName = "botProvision.all.bicep";
    const testConfigurationModuleFileName = "botConfiguration.all.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-aad-app-for-teams": {},
        "fx-resource-frontend-hosting": {},
        "fx-resource-simple-auth": {},
        "fx-resource-bot": {
          Modules: {
            botProvision: {
              Path: `./${testProvisionModuleFileName}`,
            },
            botConfiguration: {
              Path: `./${testConfigurationModuleFileName}`,
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
      chai.assert.strictEqual(
        compiledResult.Modules!.botProvision.Content,
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, testProvisionModuleFileName),
          ConstantString.UTF8Encoding
        )
      );
      chai.assert.strictEqual(
        compiledResult.Modules!.botConfiguration.Content,
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, testConfigurationModuleFileName),
          ConstantString.UTF8Encoding
        )
      );
      chai.assert.strictEqual(
        compiledResult.Orchestration.ModuleTemplate!.Content,
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, "module.all.bicep"),
          ConstantString.UTF8Encoding
        )
      );
      chai.assert.strictEqual(
        compiledResult.Orchestration.ParameterTemplate!.Content,
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, "param.bicep"),
          ConstantString.UTF8Encoding
        )
      );
      chai.assert.strictEqual(
        compiledResult.Orchestration.OutputTemplate!.Content,
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, "output.bicep"),
          ConstantString.UTF8Encoding
        )
      );
      chai.assert.strictEqual(
        JSON.stringify(
          compiledResult.Orchestration.ParameterTemplate!.ParameterJson,
          undefined,
          2
        ) + "\n",
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, "parameters.json"),
          ConstantString.UTF8Encoding
        )
      );
      chai.assert.isUndefined(compiledResult.Orchestration.VariableTemplate);
    }
  });
});
