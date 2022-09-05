// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
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
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";
import { ApimValidator } from "../../commonlib";
import AzureLogin from "../../../src/commonlib/azureLogin";
import M365Login from "../../../src/commonlib/m365Login";
import mockedEnv from "mocked-env";

describe("Configuration successfully changed when with different plugins (V3)", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();
  let mockedEnvRestore: () => void;
  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_APIV3: "true",
    });
  });
  afterEach(async () => {
    mockedEnvRestore();
    await cleanUp(appName, projectPath, true, true, true);
  });
  it(`bot + apim`, async function () {
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Bot);
    await ApimValidator.init(subscription, AzureLogin, M365Login);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureApim);

    // Provision
    await setBotSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, env);
    await ApimValidator.validateProvision(context);
  });
});
