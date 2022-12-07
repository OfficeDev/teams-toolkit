// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yuqi Zhou <yuqzho@microsoft.com>
 */

import path from "path";
import {
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  getCapabilitiesFromProjectSetting,
} from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import fs from "fs-extra";
import { expect } from "chai";
import { SubscriptionInfo } from "@microsoft/teamsfx-api";
import { FrontendValidator } from "../../commonlib";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Provision with subscriptionInfo.json that has logged out", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  const env = Object.assign({}, process.env);

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  });

  it("Provision Tab project", { testPlanCaseId: 15687219 }, async function () {
    if (isV3Enabled()) {
      this.skip();
    }
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab, env);

    // Assert
    await FrontendValidator.validateScaffold(projectPath, "javascript");

    // Arrange
    const subscriptionInfo: SubscriptionInfo = {
      subscriptionName: "test",
      subscriptionId: "b91424c7-bd0f-45a1-91e7-d8916efbbcdc",
      tenantId: "b91424c7-bd0f-45a1-91e7-d8916efbbcdc",
    };
    const subscriptionInfoJsonFilePath = path.join(projectPath, "./.fx/subscriptionInfo.json");
    await fs.writeJSON(subscriptionInfoJsonFilePath, JSON.stringify(subscriptionInfo, null, 4));

    await CliHelper.provisionProject(projectPath, "", env);

    // Assert
    const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);
  });
});
