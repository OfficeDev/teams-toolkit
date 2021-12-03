// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "fs-extra";
import * as path from "path";

import { AzureSolutionSettings } from "@microsoft/teamsfx-api";
import { FunctionPlugin } from "../../../../../src";
import {
  ConstantString,
  mockSolutionGenerateArmTemplates,
  mockSolutionUpdateArmTemplates,
  ResourcePlugins,
} from "../../util";
import { MockContext } from "../helper";
import { FunctionBicep } from "../../../../../src/plugins/resource/function/constants";

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
    const testProvisionModuleFileName = "functionProvision.result.bicep";
    const testConfigurationModuleFileName = "functionConfig.result.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-function": {
          Provision: {
            function: {
              ProvisionPath: `./${testProvisionModuleFileName}`,
            },
          },
          Configuration: {
            function: {
              ConfigPath: `./${testConfigurationModuleFileName}`,
            },
          },
          References: {
            functionAppResourceId: FunctionBicep.functionAppResourceId,
            functionEndpoint: FunctionBicep.functionEndpoint,
          },
        },
        "fx-resource-frontend-hosting": {
          Outputs: {
            endpoint: "frontend_hosting_test_endpoint",
          },
          References: {
            domain: "provisionOutputs.frontendHostingOutput.value.domain",
            endpoint: "provisionOutputs.frontendHostingOutput.value.endpoint",
          },
        },
        "fx-resource-identity": {
          Outputs: {
            endpoint: "frontend_hosting_test_endpoint",
          },
          References: {
            identityClientId: "provisionOutputs.identityOutput.value.identityClientId",
            identityResourceId: "userAssignedIdentityProvision.outputs.identityResourceId",
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

      const expectedProvisionModuleFilePath = path.join(
        expectedBicepFileDirectory,
        testProvisionModuleFileName
      );
      chai.assert.strictEqual(
        expectedResult.Provision!.Modules!.function,
        fs.readFileSync(expectedProvisionModuleFilePath, ConstantString.UTF8Encoding)
      );

      const expectedConfigurationModuleFilePath = path.join(
        expectedBicepFileDirectory,
        testConfigurationModuleFileName
      );
      chai.assert.strictEqual(
        expectedResult.Configuration!.Modules!.function,
        fs.readFileSync(expectedConfigurationModuleFilePath, ConstantString.UTF8Encoding)
      );

      const orchestrationProvisionFile = await fs.readFile(
        path.join(expectedBicepFileDirectory, "provision.result.bicep"),
        ConstantString.UTF8Encoding
      );

      chai.assert.strictEqual(expectedResult.Provision!.Orchestration, orchestrationProvisionFile);

      chai.assert.strictEqual(
        expectedResult.Configuration!.Orchestration,
        fs.readFileSync(
          path.join(expectedBicepFileDirectory, "config.result.bicep"),
          ConstantString.UTF8Encoding
        )
      );
    }
  });

  it("Update bicep arm templates", async () => {
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
    const testProvisionModuleFileName = "functionProvision.result.bicep";
    const testConfigurationModuleFileName = "functionConfig.result.bicep";
    const mockedSolutionDataContext = {
      Plugins: activeResourcePlugins,
      PluginOutput: {
        "fx-resource-function": {
          Provision: {
            function: {
              ProvisionPath: `./${testProvisionModuleFileName}`,
            },
          },
          Configuration: {
            function: {
              ConfigPath: `./${testConfigurationModuleFileName}`,
            },
          },
          References: {
            functionAppResourceId: FunctionBicep.functionAppResourceId,
            functionEndpoint: FunctionBicep.functionEndpoint,
          },
        },
        "fx-resource-frontend-hosting": {
          Outputs: {
            endpoint: "frontend_hosting_test_endpoint",
          },
          References: {
            domain: "provisionOutputs.frontendHostingOutput.value.domain",
            endpoint: "provisionOutputs.frontendHostingOutput.value.endpoint",
          },
        },
        "fx-resource-identity": {
          Outputs: {
            endpoint: "frontend_hosting_test_endpoint",
          },
          References: {
            identityClientId: "provisionOutputs.identityOutput.value.identityClientId",
            identityResourceId: "userAssignedIdentityProvision.outputs.identityResourceId",
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
      const expectedConfigurationModuleFilePath = path.join(
        expectedBicepFileDirectory,
        testConfigurationModuleFileName
      );
      chai.assert.strictEqual(
        expectedResult.Configuration!.Modules!.function,
        fs.readFileSync(expectedConfigurationModuleFilePath, ConstantString.UTF8Encoding)
      );
      chai.assert.exists(expectedResult.Provision!.Reference!.functionAppResourceId);
      chai.assert.exists(expectedResult.Provision!.Reference!.functionEndpoint);
      chai.assert.notExists(expectedResult.Provision!.Orchestration);
      chai.assert.notExists(expectedResult.Provision!.Modules);
      chai.assert.notExists(expectedResult.Configuration!.Orchestration);
      chai.assert.notExists(expectedResult.Parameters);
    }
  });
});
