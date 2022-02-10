// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
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

describe("Add capabilities", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    await cleanUp(appName, projectPath, true, true, false, true);
  });

  it("tab project can add messaging extension capability and provision", async () => {
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);

    // Act
    await CliHelper.addCapabilityToProject(projectPath, Capability.MessagingExtension);

    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await setBotSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Assert
    await validateTabAndBotProjectProvision(projectPath, env);
  });
});
