// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import { AzureSolutionSettings, PluginContext } from "@microsoft/teamsfx-api";

import {
  ConstantString,
  mockSolutionUpdateArmTemplates,
  mockSolutionUpdateArmTemplatesV2,
  ResourcePlugins,
} from "../../util";
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
    const activeResourcePlugins = [
      ResourcePlugins.Aad,
      ResourcePlugins.Bot,
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
    const provisionModuleFileName = "botProvision.result.v2.bicep";
    const configurationModuleFileName = "botConfig.result.v2.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-bot": {
          Provision: {
            bot: {
              ProvisionPath: `./${provisionModuleFileName}`,
            },
          },
          Configuration: {
            bot: {
              ConfigPath: `./${configurationModuleFileName}`,
            },
          },
        },
        "fx-resource-identity": {
          References: {
            identityName: "provisionOutputs.identityOutput.value.identityName",
            identityClientId: "provisionOutputs.identityOutput.value.identityClientId",
            identityResourceId: "userAssignedIdentityProvision.outputs.identityResourceId",
          },
        },
      },
    };
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      const compiledResult = mockSolutionUpdateArmTemplatesV2(
        mockedSolutionDataContext,
        result.value
      );

      const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
      const provisionModuleFile = await fs.readFile(
        path.join(expectedBicepFileDirectory, provisionModuleFileName),
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(compiledResult.Provision!.Modules!.bot, provisionModuleFile);

      const configModuleFile = await fs.readFile(
        path.join(expectedBicepFileDirectory, configurationModuleFileName),
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(compiledResult.Configuration!.Modules!.bot, configModuleFile);

      const orchestrationProvisionFile = await fs.readFile(
        path.join(expectedBicepFileDirectory, "provision.result.v2.bicep"),
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(compiledResult.Provision!.Orchestration, orchestrationProvisionFile);

      chai.assert.strictEqual(
        compiledResult.Configuration!.Orchestration,
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, "config.result.v2.bicep"),
          ConstantString.UTF8Encoding
        )
      );
      chai.assert.strictEqual(
        JSON.stringify(compiledResult.Parameters, undefined, 2),
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, "parameters.json"),
          ConstantString.UTF8Encoding
        )
      );
      // chai.assert.isUndefined(compiledResult.Orchestration.VariableTemplate);
    }
  });

  it("generate bicep arm templates: new bot with all resource plugins enabled", async () => {
    return;
    // Arrange
    // const activeResourcePlugins = [
    //   ResourcePlugins.Aad,
    //   ResourcePlugins.SimpleAuth,
    //   ResourcePlugins.FrontendHosting,
    //   ResourcePlugins.Bot,
    //   ResourcePlugins.Function,
    //   ResourcePlugins.AzureSQL,
    //   ResourcePlugins.Identity,
    // ];
    // const pluginContext: PluginContext = testUtils.newPluginContext();
    // const azureSolutionSettings = pluginContext.projectSettings!
    //   .solutionSettings! as AzureSolutionSettings;
    // azureSolutionSettings.activeResourcePlugins = activeResourcePlugins;
    // pluginContext.projectSettings!.solutionSettings = azureSolutionSettings;

    // // Act
    // const result = await botPlugin.generateArmTemplates(pluginContext);

    // // Assert
    // const testProvisionModuleFileName = "botProvision.all.bicep";
    // const testConfigurationModuleFileName = "botConfiguration.all.bicep";
    // const mockedSolutionDataContext = {
    //   Plugins: activeResourcePlugins,
    //   PluginOutput: {
    //     "fx-resource-aad-app-for-teams": {},
    //     "fx-resource-frontend-hosting": {},
    //     "fx-resource-simple-auth": {},
    //     "fx-resource-bot": {
    //       Modules: {
    //         botProvision: {
    //           Path: `./${testProvisionModuleFileName}`,
    //         },
    //         botConfiguration: {
    //           Path: `./${testConfigurationModuleFileName}`,
    //         },
    //       },
    //     },
    //     "fx-resource-function": {
    //       Outputs: {
    //         functionEndpoint: "test_function_endpoint",
    //       },
    //     },
    //     "fx-resource-azure-sql": {
    //       Outputs: {
    //         databaseName: "test_sql_database_name",
    //         sqlEndpoint: "test_sql_endpoint",
    //       },
    //     },
    //     "fx-resource-identity": {
    //       Outputs: {
    //         identityClientId: "test_identity_id",
    //         identityResourceId: "test_identity_resource_id",
    //       },
    //     },
    //   },
    // };
    // chai.assert.isTrue(result.isOk());
    // if (result.isOk()) {
    //   const compiledResult = mockSolutionUpdateArmTemplates(
    //     mockedSolutionDataContext,
    //     result.value
    //   );

    //   const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
    //   chai.assert.strictEqual(
    //     compiledResult.Modules!.botProvision.Content,
    //     fs.readFileSync(
    //       path.join(expectedBicepFileDirectory, testProvisionModuleFileName),
    //       ConstantString.UTF8Encoding
    //     )
    //   );
    //   chai.assert.strictEqual(
    //     compiledResult.Modules!.botConfiguration.Content,
    //     fs.readFileSync(
    //       path.join(expectedBicepFileDirectory, testConfigurationModuleFileName),
    //       ConstantString.UTF8Encoding
    //     )
    //   );
    //   chai.assert.strictEqual(
    //     compiledResult.Orchestration.ModuleTemplate!.Content,
    //     fs.readFileSync(
    //       path.join(expectedBicepFileDirectory, "module.all.bicep"),
    //       ConstantString.UTF8Encoding
    //     )
    //   );
    //   chai.assert.strictEqual(
    //     compiledResult.Orchestration.ParameterTemplate!.Content,
    //     fs.readFileSync(
    //       path.join(expectedBicepFileDirectory, "param.bicep"),
    //       ConstantString.UTF8Encoding
    //     )
    //   );
    //   chai.assert.strictEqual(
    //     compiledResult.Orchestration.OutputTemplate!.Content,
    //     fs.readFileSync(
    //       path.join(expectedBicepFileDirectory, "output.bicep"),
    //       ConstantString.UTF8Encoding
    //     )
    //   );
    //   chai.assert.strictEqual(
    //     JSON.stringify(compiledResult.Orchestration.ParameterTemplate!.ParameterJson, undefined, 2),
    //     fs.readFileSync(
    //       path.join(expectedBicepFileDirectory, "parameters.json"),
    //       ConstantString.UTF8Encoding
    //     )
    //   );
    //   chai.assert.isUndefined(compiledResult.Orchestration.VariableTemplate);
    // }
  });
});
