// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Bowen Song <bowsong@microsoft.com>
 */

import path from "path";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  execAsync,
  getActivePluginsFromProjectSetting,
  getCapabilitiesFromProjectSetting,
  readContextMultiEnv,
  setFrontendDomainToConfig,
} from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, PluginId } from "../../commonlib/constants";
import fs from "fs-extra";
import { expect } from "chai";
import { AadValidator } from "../../commonlib";
import { it } from "@microsoft/extra-shot-mocha";
import M365Login from "../../../src/commonlib/m365Login";
import { isV3Enabled } from "@microsoft/teamsfx-core";
describe("Add SSO", () => {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  const env = Object.assign({}, process.env);
  env["TEAMSFX_AAD_MANIFEST"] = "true";
  env["TEAMSFX_CONFIG_UNIFY"] = "true";
  env["TEAMSFX_INIT_APP"] = "true";

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  });

  it("Add SSO to existing app", { testPlanCaseId: 15687165 }, async function () {
    if (isV3Enabled()) {
      this.skip();
    }
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.ExistingTab, env);
    await setFrontendDomainToConfig(projectPath, "dev");

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

    await CliHelper.provisionProject(projectPath, "", env);

    // Assert
    const context = await readContextMultiEnv(projectPath, "dev");
    // Validate Aad App
    const aad = AadValidator.init(context, false, M365Login);
    await AadValidator.validate(aad);
  });
});
