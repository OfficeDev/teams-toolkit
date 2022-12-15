// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import path from "path";
import { environmentManager, isV3Enabled } from "@microsoft/teamsfx-core";
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
import "mocha";
import * as chai from "chai";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";

describe("User can customize Bicep files", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  });

  it(
    "user customized Bicep file is used when provision",
    { testPlanCaseId: 15687187 },
    async function () {
      if (isV3Enabled()) {
        this.skip();
      }
      // Arrange
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);

      // Act
      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      const customizedServicePlans: string[] = await customizeBicepFile(projectPath);
      await CliHelper.setSubscription(subscription, projectPath);
      await CliHelper.provisionProject(projectPath);

      const resourceGroup = await getRGAfterProvision(projectPath, env);
      chai.assert.exists(resourceGroup);
      chai.expect(resourceGroup).to.be.a("string");

      // Assert
      customizedServicePlans.forEach(async (servicePlanName) => {
        await validateServicePlan(servicePlanName, resourceGroup!, subscription);
      });
    }
  );
});
