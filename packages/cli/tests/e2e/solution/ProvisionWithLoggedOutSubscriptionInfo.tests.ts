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

describe("Provision with subscriptionInfo.json that has logged out", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  const env = Object.assign({}, process.env);

  after(async () => {
    await cleanUp(appName, projectPath, true, true, false);
  });

  it("Provision non SSO Tab project", async () => {
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab, env);

    // Assert
    const capabilities = await getCapabilitiesFromProjectSetting(projectPath);
    expect(capabilities.includes(Capability.Tab)).to.be.true;

    const subscriptionInfoJsonFilePath = path.join(projectPath, ".fx/subscriptionInfo.json");
    expect(await fs.pathExists(subscriptionInfoJsonFilePath)).to.be.true;

    // Arrange
    const subscriptionInfo: SubscriptionInfo = {
      subscriptionName: "test",
      subscriptionId: "b91424c7-bd0f-45a1-91e7-d8916efbbcdc",
      tenantId: "b91424c7-bd0f-45a1-91e7-d8916efbbcdc",
    };
    fs.writeJSON(subscriptionInfoJsonFilePath, JSON.stringify(subscriptionInfo, null, 4));

    await CliHelper.provisionProject(projectPath, "", env);

    // Assert
    const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);
  });
});
