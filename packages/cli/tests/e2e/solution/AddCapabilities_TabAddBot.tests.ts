// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import path from "path";
import { environmentManager } from "@microsoft/teamsfx-core";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setBotSkuNameToB1Bicep,
  setSimpleAuthSkuNameToB1Bicep,
  validateTabAndBotProjectProvision,
} from "../commonUtils";
import "mocha";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Add capabilities", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  let appName: string | undefined;
  let projectPath: string | undefined;
  const env = environmentManager.getDefaultEnvName();
  afterEach(async () => {
    if (appName && projectPath) {
      await cleanUp(appName, projectPath, true, true, false);
    }
  });
  it(
    `tab project can add bot capability and provision`,
    { testPlanCaseId: 15687148 },
    async function () {
      if (isV3Enabled()) {
        this.skip();
      }
      appName = getUniqueAppName();
      projectPath = path.resolve(testFolder, appName);

      // Arrange
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
      // Act
      await CliHelper.addCapabilityToProject(projectPath, Capability.Bot);

      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await setBotSkuNameToB1Bicep(projectPath, env);
      await CliHelper.setSubscription(subscription, projectPath);
      await CliHelper.provisionProject(projectPath);

      // Asserts
      await validateTabAndBotProjectProvision(projectPath, env);
    }
  );

  it(
    `tab project can add message extension capability and provision`,
    { testPlanCaseId: 15687149 },
    async function () {
      if (isV3Enabled()) {
        this.skip();
      }
      appName = getUniqueAppName();
      projectPath = path.resolve(testFolder, appName);
      // Arrange
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);

      // Act
      await CliHelper.addCapabilityToProject(projectPath, Capability.MessageExtension);

      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await setBotSkuNameToB1Bicep(projectPath, env);
      await CliHelper.setSubscription(subscription, projectPath);
      await CliHelper.provisionProject(projectPath);
      // Assert
      await validateTabAndBotProjectProvision(projectPath, env);
    }
  );
});
