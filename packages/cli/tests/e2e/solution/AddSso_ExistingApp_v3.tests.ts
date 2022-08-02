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
import M365Login from "../../../src/commonlib/m365Login";
import mockedEnv from "mocked-env";

describe("Add SSO V3", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  let mockedEnvRestore: () => void;
  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_AAD_MANIFEST: "true",
      TEAMSFX_CONFIG_UNIFY: "true",
      TEAMSFX_INIT_APP: "true",
      TEAMSFX_APIV3: "true",
    });
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Bot);
  });
  afterEach(async () => {
    mockedEnvRestore();
    await cleanUp(appName, projectPath, true, false, false);
  });

  it("Add SSO to existing app", async () => {
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.ExistingTab);
    await setFrontendDomainToConfig(projectPath, "dev");

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

    await CliHelper.provisionProject(projectPath, "");

    // Assert
    const context = await readContextMultiEnv(projectPath, "dev");
    // Validate Aad App
    const aad = AadValidator.init(context, false, M365Login);
    await AadValidator.validate(aad);
  });
});
