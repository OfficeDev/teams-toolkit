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
  setSimpleAuthSkuNameToB1Bicep,
  getRGAfterProvision,
  customizeBicepFile,
  validateServicePlan,
} from "../commonUtils";
import { FeatureFlagName } from "@microsoft/teamsfx-core/src/common/constants";
import "mocha";
import * as chai from "chai";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";

describe("User can customize Bicep files", function () {
  //  Only test when insider feature flag enabled
  if (!isFeatureFlagEnabled(FeatureFlagName.InsiderPreview, true)) {
    return;
  }

  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  after(async () => {
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
      await validateServicePlan(servicePlanName, resourceGroup!, subscription);
    });
  });
});
