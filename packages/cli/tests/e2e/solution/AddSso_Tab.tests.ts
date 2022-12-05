// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Bowen Song <bowsong@microsoft.com>
 */

import path from "path";
import {
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  validateTabAndBotProjectProvision,
  execAsync,
  getActivePluginsFromProjectSetting,
  getCapabilitiesFromProjectSetting,
  setBotSkuNameToB1Bicep,
} from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, PluginId } from "../../commonlib/constants";
import fs from "fs-extra";
import { expect } from "chai";
import { it } from "@microsoft/extra-shot-mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import { isV3Enabled } from "@microsoft/teamsfx-core";
describe("Add SSO", () => {
  const testFolder = getTestFolder();
  let appName: string | undefined;
  let projectPath: string | undefined;
  let mockedEnvRestore: RestoreFn | undefined;

  afterEach(async () => {
    if (appName && projectPath) {
      await cleanUp(appName, projectPath, true, true, false);
    }
    if (mockedEnvRestore) {
      mockedEnvRestore();
    }
  });

  it(`Add SSO to non SSO Tab project`, { testPlanCaseId: 15687171 }, async function () {
    if (isV3Enabled()) {
      this.skip();
    }
    mockedEnvRestore = mockedEnv({
      TEAMSFX_AAD_MANIFEST: "true",
      TEAMSFX_CONFIG_UNIFY: "true",
    });
    appName = getUniqueAppName();
    projectPath = path.resolve(testFolder, appName);

    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.TabNonSso);

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

    await setBotSkuNameToB1Bicep(projectPath, "dev");
    await CliHelper.provisionProject(projectPath);

    // Assert
    await validateTabAndBotProjectProvision(projectPath, "dev");
  });
});
