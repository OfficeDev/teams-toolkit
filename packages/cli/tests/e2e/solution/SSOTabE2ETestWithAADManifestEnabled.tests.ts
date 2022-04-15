// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import {
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  readContextMultiEnv,
  setAadManifestIdentifierUris,
} from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";
import {
  Capability,
  PluginId,
  ProjectSettingKey,
  ResourceToDeploy,
  TestFilePath,
} from "../../commonlib/constants";
import fs from "fs-extra";
import { expect } from "chai";
import { AadValidator, BotValidator, FrontendValidator } from "../../commonlib";
import appStudioLogin from "../../../src/commonlib/appStudioLogin";

describe("SSO Tab with aad manifest enabled", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  const env = Object.assign({}, process.env);
  env["TEAMSFX_AAD_MANIFEST"] = "true";
  env["TEAMSFX_CONFIG_UNIFY"] = "true";

  after(async () => {
    await cleanUp(appName, projectPath, true, true, false);
  });

  it("SSO Tab E2E test with aad manifest enabled", async () => {
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab, env);

    // Assert
    {
      const projectSettings = await fs.readJSON(
        path.join(projectPath, TestFilePath.configFolder, TestFilePath.projectSettingsFileName)
      );
      const activeResourcePlugins =
        projectSettings[ProjectSettingKey.solutionSettings][
          ProjectSettingKey.activeResourcePlugins
        ];
      const capabilities =
        projectSettings[ProjectSettingKey.solutionSettings][ProjectSettingKey.capabilities];
      expect(activeResourcePlugins.includes(PluginId.Aad)).to.be.true;
      expect(activeResourcePlugins.includes(PluginId.FrontendHosting)).to.be.true;
      expect(capabilities.includes("Tab")).to.be.true;
      expect(capabilities.includes("TabSSO")).to.be.true;
    }

    await CliHelper.provisionProject(projectPath, "", env);

    const context = await readContextMultiEnv(projectPath, "dev");

    // Validate Aad App
    const aad = AadValidator.init(context, false, appStudioLogin);
    await AadValidator.validate(aad);

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context, true);
    await FrontendValidator.validateProvision(frontend);

    const firstIdentifierUri = "api://first.com/291fc1b5-1146-4d33-b7b8-ec4c441b6b33";
    await setAadManifestIdentifierUris(projectPath, firstIdentifierUri);

    // Deploy all resources without aad manifest
    await CliHelper.deployAll(projectPath);
    await AadValidator.validate(aad);

    // Deploy all resources include aad manifest
    await CliHelper.deployAll(projectPath, "--include-aad-manifest");
    await AadValidator.validate(aad, firstIdentifierUri);

    const secondIdentifierUri = "api://second.com/291fc1b5-1146-4d33-b7b8-ec4c441b6b33";
    await setAadManifestIdentifierUris(projectPath, secondIdentifierUri);

    // Only deploy aad manifest
    await CliHelper.deployProject(ResourceToDeploy.AadManifest, projectPath);
    await AadValidator.validate(aad, secondIdentifierUri);
  });
});
