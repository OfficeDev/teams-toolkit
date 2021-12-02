// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as path from "path";
import { TestHelper } from "../helper";
import * as fs from "fs-extra";
import { PluginContext } from "@microsoft/teamsfx-api";
import { ConstantString, mockSolutionGenerateArmTemplates } from "../../util";
import { KeyVaultPlugin } from "../../../../../src";
import { Constants } from "../../../../../src/plugins/resource/keyvault/constants";

chai.use(chaiAsPromised);

describe("keyVaultPlugin", () => {
  let keyVaultPlugin: KeyVaultPlugin;
  let pluginContext: PluginContext;

  beforeEach(async () => {
    keyVaultPlugin = new KeyVaultPlugin();
    pluginContext = await TestHelper.pluginContext();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("generate arm templates", async function () {
    // Act
    const generateArmTemplatesResult = await keyVaultPlugin.generateArmTemplates(pluginContext);

    // Assert
    const testModuleFileName = "keyVaultProvision.result.bicep";
    const mockedSolutionDataContext = {
      Plugins: pluginContext!.projectSettings!.solutionSettings!.activeResourcePlugins,
      PluginOutput: {
        "fx-resource-key-vault": {
          Provision: {
            keyVault: {
              ProvisionPath: `./${testModuleFileName}`,
            },
          },
        },
        "fx-resource-identity": {
          References: {
            identityPrincipalId: "userAssignedIdentityProvision.outputs.identityPrincipalId",
          },
        },
      },
    };

    chai.assert.isTrue(generateArmTemplatesResult.isOk());
    if (generateArmTemplatesResult.isOk()) {
      const result = mockSolutionGenerateArmTemplates(
        mockedSolutionDataContext,
        generateArmTemplatesResult.value
      );

      const expectedBicepFileDirectory = path.join(__dirname, "expectedBicepFiles");
      const expectedModuleFilePath = path.join(expectedBicepFileDirectory, testModuleFileName);
      const moduleFile = await fs.readFile(expectedModuleFilePath, ConstantString.UTF8Encoding);
      chai.assert.strictEqual(result.Provision!.Modules!.keyVault, moduleFile);

      const expectedPrvosionSnippetFilePath = path.join(
        expectedBicepFileDirectory,
        "provision.result.bicep"
      );
      const orchestrationProvisionFile = await fs.readFile(
        expectedPrvosionSnippetFilePath,
        ConstantString.UTF8Encoding
      );
      chai.assert.strictEqual(result.Provision!.Orchestration, orchestrationProvisionFile);
    }
  });
});
