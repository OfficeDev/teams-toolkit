// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
 */

import path from "path";
import { environmentManager, isFeatureFlagEnabled } from "@microsoft/teamsfx-core";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setBotSkuNameToB1Bicep,
  readContextMultiEnv,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import { FeatureFlagName } from "@microsoft/teamsfx-core/src/common/constants";
import "mocha";
import { getWebappServicePlan } from "../../commonlib/utilities";
import * as fs from "fs-extra";
import MockAzureAccountProvider from "../../../src/commonlib/azureLoginUserPassword";
import * as chai from "chai";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, ConfigKey, Resource, TestFilePath } from "../../commonlib/constants";

describe("User can customize Bicep files", function () {
  //  Only test when insider feature flag enabled
  if (!isFeatureFlagEnabled(FeatureFlagName.InsiderPreview, true)) {
    return;
  }

  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  let appName: string, projectPath: string;

  beforeEach(async () => {
    appName = getUniqueAppName();
    projectPath = path.resolve(testFolder, appName);
  });

  afterEach(async () => {
    await cleanUp(appName, projectPath, true, false, false, true);
  });

  it("user customized Bicep file is used when provision", async () => {
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);

    // Act
    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    const customizedServicePlans: string[] = await customizeBicepFile(projectPath);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    const resourceGroup = await getRGAfterProvision(projectPath);
    chai.assert.exists(resourceGroup);
    chai.expect(resourceGroup).to.be.a("string");

    // Assert
    customizedServicePlans.forEach(async (servicePlanName) => {
      await validateServicePlan(servicePlanName, resourceGroup!);
    });
  });

  it("Regenerate Bicep will not affect user's customized Bicep code", async () => {
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);

    // Act
    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    const customizedServicePlans: string[] = await customizeBicepFile(projectPath);

    // Add capability and cloud resource
    await CliHelper.addCapabilityToProject(projectPath, Capability.Bot);
    await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.addResourceToProject(projectPath, Resource.AzureFunction);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    const resourceGroup = await getRGAfterProvision(projectPath);
    chai.assert.exists(resourceGroup);
    chai.expect(resourceGroup).to.be.a("string");

    // Assert
    customizedServicePlans.forEach(async (servicePlanName) => {
      await validateServicePlan(servicePlanName, resourceGroup!);
    });
  });

  async function getRGAfterProvision(projectPath: string): Promise<string | undefined> {
    const context = await readContextMultiEnv(projectPath, environmentManager.getDefaultEnvName());
    if (
      context[ConfigKey.solutionPluginName] &&
      context[ConfigKey.solutionPluginName][ConfigKey.resourceGroupName]
    ) {
      return context[ConfigKey.solutionPluginName][ConfigKey.resourceGroupName];
    }
    return undefined;
  }

  async function customizeBicepFile(projectPath: string): Promise<string[]> {
    const newServerFarms: string[] = [];
    const bicepFileFolder = path.join(projectPath, TestFilePath.armTemplateBaseFolder);

    const pattern = "SERVER_FARM_NAME";
    const customizedServerFarmsBicepTemplate = `
resource customizedServerFarms 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: '${pattern}'
  location: resourceGroup().location
  sku: {
    name: 'B1'
  }
  kind: 'app'
}
`;
    const simpleAuthTestServerFarm = "simpleAuth_testResource";
    await fs.appendFile(
      path.join(bicepFileFolder, TestFilePath.provisionFolder, "simpleAuth.bicep"),
      customizedServerFarmsBicepTemplate.replace(pattern, simpleAuthTestServerFarm)
    );
    newServerFarms.push(simpleAuthTestServerFarm);

    const provisionTestServerFarm = "provision_testResource";
    await fs.appendFile(
      path.join(bicepFileFolder, TestFilePath.provisionFileName),
      customizedServerFarmsBicepTemplate.replace(pattern, provisionTestServerFarm)
    );
    newServerFarms.push(provisionTestServerFarm);

    const configTestServerFarm = "config_testResource";
    await fs.appendFile(
      path.join(bicepFileFolder, TestFilePath.configFileName),
      customizedServerFarmsBicepTemplate.replace(pattern, configTestServerFarm)
    );
    newServerFarms.push(configTestServerFarm);

    // TODO: should uncomment this part of code when the bug is resolved:
    // https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/12902499
    // const mainTestServerFarm = "main_testResource";
    // await fs.appendFile(
    //   path.join(bicepFileFolder, TestFilePath.mainFileName),
    //   customizedServerFarmsBicepTemplate.replace(pattern, mainTestServerFarm));
    // newServerFarms.push(mainTestServerFarm);

    return newServerFarms;
  }

  async function validateServicePlan(servicePlanName: string, resourceGroup: string) {
    console.log(`Start to validate server farm ${servicePlanName}.`);

    const tokenProvider = MockAzureAccountProvider;
    const tokenCredential = await tokenProvider.getAccountCredentialAsync();
    const token = (await tokenCredential?.getToken())?.accessToken;

    const serivcePlanResponse = await getWebappServicePlan(
      subscription,
      resourceGroup,
      servicePlanName,
      token as string
    );
    chai.assert(serivcePlanResponse, "B1");
  }
});
