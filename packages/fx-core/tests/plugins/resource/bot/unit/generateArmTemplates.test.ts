// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import { AzureSolutionSettings, PluginContext } from "@microsoft/teamsfx-api";

import {
  ConstantString,
  mockSolutionGenerateArmTemplates,
  mockSolutionUpdateArmTemplates,
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

  it("generate bicep arm templates", async () => {
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
    const provisionModuleFileName = "botProvision.result.bicep";
    const configurationModuleFileName = "botConfig.result.bicep";
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
      const compiledResult = mockSolutionGenerateArmTemplates(
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
        path.join(expectedBicepFileDirectory, "provision.result.bicep"),
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(compiledResult.Provision!.Orchestration, orchestrationProvisionFile);

      chai.assert.strictEqual(
        compiledResult.Configuration!.Orchestration,
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, "config.result.bicep"),
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
    }
  });

  it("Update bicep arm templates", async () => {
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
    const provisionModuleFileName = "botProvision.result.bicep";
    const configurationModuleFileName = "botConfig.result.bicep";
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
      const compiledResult = mockSolutionUpdateArmTemplates(
        mockedSolutionDataContext,
        result.value
      );
      const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
      const configModuleFile = await fs.readFile(
        path.join(expectedBicepFileDirectory, configurationModuleFileName),
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(compiledResult.Configuration!.Modules!.bot, configModuleFile);
      chai.assert.notExists(compiledResult.Provision!.Orchestration);
      chai.assert.notExists(compiledResult.Provision!.Modules);
      chai.assert.notExists(compiledResult.Configuration!.Orchestration);
      chai.assert.notExists(compiledResult.Parameters);
      chai.assert.exists(compiledResult.Provision!.Reference!.resourceId);
      chai.assert.exists(compiledResult.Provision!.Reference!.hostName);
      chai.assert.exists(compiledResult.Provision!.Reference!.webAppEndpoint);
    }
  });
});
