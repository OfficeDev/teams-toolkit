// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
 */

import path from "path";
import "mocha";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  readContextMultiEnv,
  setBotSkuNameToB1Bicep,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";
import { ApimValidator } from "../../commonlib";
import AzureLogin from "../../../src/commonlib/azureLogin";
import M365Login from "../../../src/commonlib/m365Login";

describe("Configuration successfully changed when with different plugins", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    await cleanUp(appName, projectPath, true, true, true);
  });

  it(`tab + bot + apim`, async function () {
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    await CliHelper.addCapabilityToProject(projectPath, Capability.Bot);
    await ApimValidator.init(subscription, AzureLogin, M365Login);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureApim);

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await setBotSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, env);
    await ApimValidator.validateProvision(context);
  });
});
