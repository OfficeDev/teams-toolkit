// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Bowen Song <bowsong@microsoft.com>
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
  execAsync,
  getActivePluginsFromProjectSetting,
  getCapabilitiesFromProjectSetting,
} from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, PluginId, ProjectSettingKey, TestFilePath } from "../../commonlib/constants";
import fs from "fs-extra";
import { expect } from "chai";

describe("Add SSO", () => {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  const env = Object.assign({}, process.env);
  env["TEAMSFX_AAD_MANIFEST"] = "true";
  env["TEAMSFX_CONFIG_UNIFY"] = "true";

  after(async () => {
    await cleanUp(appName, projectPath, true, true, false);
  });

  it("Add SSO to non SSO Tab project", async () => {
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.TabNonSso, env);

    // Assert
    {
      const activeResourcePlugins = await getActivePluginsFromProjectSetting(projectPath);
      const capabilities = await getCapabilitiesFromProjectSetting(projectPath);
      expect(activeResourcePlugins.includes(PluginId.Aad)).to.be.false;
      expect(capabilities.includes(Capability.TabSso)).to.be.false;
    }

    // Act
    await execAsync(`teamsfx add sso`, {
      cwd: projectPath,
      env: env,
      timeout: 0,
    });

    // Assert
    {
      const activeResourcePlugins = await getActivePluginsFromProjectSetting(projectPath);
      const capabilities = await getCapabilitiesFromProjectSetting(projectPath);
      expect(activeResourcePlugins.includes(PluginId.Aad)).to.be.true;
      expect(capabilities.includes(Capability.TabSso)).to.be.true;

      const readmeFilePath = path.join(projectPath, "auth", "tab", "README.md");
      const readmeExists = await fs.pathExists(readmeFilePath);
      expect(readmeExists).to.be.true;
    }

    // Act
    await CliHelper.addCapabilityToProject(projectPath, Capability.Notification);

    // Assert
    {
      const capabilities = await getCapabilitiesFromProjectSetting(projectPath);
      expect(capabilities.includes(Capability.BotSso)).to.be.false;

      const readmeFilePath = path.join(projectPath, "auth", "bot", "README.md");
      const readmeExists = await fs.pathExists(readmeFilePath);
      expect(readmeExists).to.be.false;
    }

    await CliHelper.provisionProject(projectPath, "", env);

    // Assert
    await validateTabAndBotProjectProvision(projectPath, "dev");
  });
});
