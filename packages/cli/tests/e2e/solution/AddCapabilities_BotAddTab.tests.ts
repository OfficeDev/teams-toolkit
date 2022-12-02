// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import path from "path";
import { environmentManager } from "@microsoft/teamsfx-core";
import { isPreviewFeaturesEnabled } from "@microsoft/teamsfx-core/build/common/featureFlags";
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
    `bot project can add tab capability and provision`,
    { testPlanCaseId: 15687142 },
    async function () {
      if (isV3Enabled()) {
        this.skip();
      }
      appName = getUniqueAppName();
      projectPath = path.resolve(testFolder, appName);

      // Arrange
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Bot);

      // Act
      if (isPreviewFeaturesEnabled()) {
        await CliHelper.addCapabilityToProject(projectPath, Capability.SSOTab);
      } else {
        await CliHelper.addCapabilityToProject(projectPath, Capability.Tab);
      }

      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await setBotSkuNameToB1Bicep(projectPath, env);
      await CliHelper.setSubscription(subscription, projectPath);
      await CliHelper.provisionProject(projectPath);

      // Assert
      await validateTabAndBotProjectProvision(projectPath, env);
    }
  );

  it(
    `message extension project can add tab capability and provision`,
    { testPlanCaseId: 15687143 },
    async function () {
      if (isV3Enabled()) {
        this.skip();
      }
      appName = getUniqueAppName();
      projectPath = path.resolve(testFolder, appName);

      // Arrange
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.MessageExtension);

      // Act
      if (isPreviewFeaturesEnabled()) {
        await CliHelper.addCapabilityToProject(projectPath, Capability.SSOTab);
      } else {
        await CliHelper.addCapabilityToProject(projectPath, Capability.Tab);
      }

      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await setBotSkuNameToB1Bicep(projectPath, env);
      await CliHelper.setSubscription(subscription, projectPath);
      await CliHelper.provisionProject(projectPath);

      // Assert
      await validateTabAndBotProjectProvision(projectPath, env);
    }
  );
});
