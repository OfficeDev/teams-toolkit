// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as dotenv from "dotenv";
import { AzureSolutionSettings, PluginContext } from "@microsoft/teamsfx-api";
import { AadAppForTeamsPlugin } from "../../../../../src/plugins/resource/aad/index";
import { TestHelper } from "../helper";
import { ConstantString, mockSolutionUpdateArmTemplates, ResourcePlugins } from "../../util";
import path from "path";
import * as fs from "fs-extra";

dotenv.config();

describe("AadGenerateArmTemplates", () => {
  let AADPlugin: AadAppForTeamsPlugin;

  beforeEach(async () => {
    AADPlugin = new AadAppForTeamsPlugin();
  });

  it("generate arm templates: tab", async function () {
    // Act
    const activeResourcePlugins = [
      ResourcePlugins.Aad,
      ResourcePlugins.FrontendHosting,
      ResourcePlugins.SimpleAuth,
    ];
    const pluginContext: PluginContext = await TestHelper.pluginContext(new Map(), true, false);
    pluginContext.projectSettings!.solutionSettings = {
      name: "test_solution",
      version: "1.0.0",
      activeResourcePlugins: activeResourcePlugins,
    } as AzureSolutionSettings;
    const result = await AADPlugin.generateArmTemplates(pluginContext);

    // Assert
    const mockedSolutionDataContext = {
      plugins: activeResourcePlugins,
      "fx-resource-aad-app-for-teams": {},
      "fx-resource-frontend-hosting": {
        outputs: {
          domain: "test_frontend_hosting_domain_url",
        },
      },
      "fx-resource-simple-auth": {},
    };
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      const expectedResult = mockSolutionUpdateArmTemplates(
        mockedSolutionDataContext,
        result.value
      );

      const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
      const expectedParameterFilePath = path.join(expectedBicepFileDirectory, "input_param.bicep");
      chai.assert.strictEqual(
        expectedResult.Orchestration.ParameterTemplate!.Content,
        fs.readFileSync(expectedParameterFilePath, ConstantString.UTF8Encoding)
      );
      const expectedVariablesFilePath = path.join(
        expectedBicepFileDirectory,
        "tab_variables.bicep"
      );
      chai.assert.strictEqual(
        expectedResult.Orchestration.VariableTemplate!.Content,
        fs.readFileSync(expectedVariablesFilePath, ConstantString.UTF8Encoding)
      );
      const expectedParameterJsonFilePath = path.join(
        expectedBicepFileDirectory,
        "parameters.json"
      );
      chai.assert.strictEqual(
        expectedResult.Orchestration.ParameterTemplate!.ParameterFile,
        fs.readFileSync(expectedParameterJsonFilePath, ConstantString.UTF8Encoding)
      );
      chai.assert.isUndefined(expectedResult.Modules);
      chai.assert.isUndefined(expectedResult.Orchestration.ModuleTemplate);
      chai.assert.isUndefined(expectedResult.Orchestration.OutputTemplate);
    }
  });

  it("generate arm templates: bot", async function () {
    // Act
    const activeResourcePlugins = [ResourcePlugins.Bot, ResourcePlugins.Aad];
    const pluginContext: PluginContext = await TestHelper.pluginContext(new Map(), true, false);
    pluginContext.projectSettings!.solutionSettings = {
      name: "test_solution",
      version: "1.0.0",
      activeResourcePlugins: activeResourcePlugins,
    } as AzureSolutionSettings;
    const result = await AADPlugin.generateArmTemplates(pluginContext);

    // Assert
    const mockedSolutionDataContext = {
      plugins: activeResourcePlugins,
      "fx-resource-bot": {
        outputs: {
          domain: "test_bot_domain_url",
        },
      },
      "fx-resource-aad-app-for-teams": {},
    };
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      const expectedResult = mockSolutionUpdateArmTemplates(
        mockedSolutionDataContext,
        result.value
      );

      const expectedVariablesFilePath = path.join(
        __dirname,
        "expectedBicepFiles",
        "bot_variables.bicep"
      );
      chai.assert.strictEqual(
        expectedResult.Orchestration.VariableTemplate!.Content,
        fs.readFileSync(expectedVariablesFilePath, ConstantString.UTF8Encoding)
      );
    }
  });

  it("generate arm templates: tab and bot", async function () {
    // Act
    const activeResourcePlugins = [
      ResourcePlugins.Bot,
      ResourcePlugins.Aad,
      ResourcePlugins.FrontendHosting,
      ResourcePlugins.SimpleAuth,
    ];
    const pluginContext: PluginContext = await TestHelper.pluginContext(new Map(), true, false);
    pluginContext.projectSettings!.solutionSettings = {
      name: "test_solution",
      version: "1.0.0",
      activeResourcePlugins: activeResourcePlugins,
    } as AzureSolutionSettings;
    const result = await AADPlugin.generateArmTemplates(pluginContext);

    // Assert
    const mockedSolutionDataContext = {
      plugins: activeResourcePlugins,
      "fx-resource-bot": {
        outputs: {
          domain: "test_bot_domain_url",
        },
      },
      "fx-resource-aad-app-for-teams": {},
      "fx-resource-frontend-hosting": {
        outputs: {
          domain: "test_frontend_hosting_domain_url",
        },
      },
      "fx-resource-simple-auth": {},
    };
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      const expectedResult = mockSolutionUpdateArmTemplates(
        mockedSolutionDataContext,
        result.value
      );

      const expectedVariablesFilePath = path.join(
        __dirname,
        "expectedBicepFiles",
        "tabAndBot_variables.bicep"
      );
      chai.assert.strictEqual(
        expectedResult.Orchestration.VariableTemplate!.Content,
        fs.readFileSync(expectedVariablesFilePath, ConstantString.UTF8Encoding)
      );
    }
  });
});
