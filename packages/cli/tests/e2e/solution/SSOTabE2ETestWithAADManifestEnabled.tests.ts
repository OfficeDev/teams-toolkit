// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Wenyu Tang <wenyutang@microsoft.com>
 */

import path from "path";
import {
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  readContextMultiEnv,
  readContextMultiEnvV3,
  setAadManifestIdentifierUris,
  setAadManifestIdentifierUrisV3,
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
import M365Login from "../../../src/commonlib/m365Login";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("SSO Tab with aad manifest enabled", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  const env = Object.assign({}, process.env);
  env["TEAMSFX_AAD_MANIFEST"] = "true";
  env["TEAMSFX_CONFIG_UNIFY"] = "true";

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  });

  it("SSO Tab E2E test with aad manifest enabled", { testPlanCaseId: 15687261 }, async () => {
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab, env);
    if (!isV3Enabled()) {
      // Assert
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

      const aadTemplatePath = path.join(
        projectPath,
        TestFilePath.manifestFolder,
        TestFilePath.aadManifestTemplateFileName
      );
      expect(await fs.pathExists(aadTemplatePath)).to.be.true;

      const permissionJsonFilePath = path.join(projectPath, TestFilePath.permissionJsonFileName);
      expect(await fs.pathExists(permissionJsonFilePath)).to.be.false;
    } else {
      // Assert
      expect(fs.pathExistsSync(path.join(projectPath, "infra", "azure.bicep"))).to.be.true;
      expect(fs.pathExistsSync(path.join(projectPath, "infra", "azure.parameters.json"))).to.be
        .true;
      expect(fs.pathExistsSync(path.join(projectPath, "teamsapp.yml"))).to.be.true;
      expect(fs.pathExistsSync(path.join(projectPath, "aad.manifest.json"))).to.be.true;
    }

    await CliHelper.provisionProject(projectPath, "", env);

    const context = isV3Enabled()
      ? await readContextMultiEnvV3(projectPath, "dev")
      : await readContextMultiEnv(projectPath, "dev");

    // Validate Aad App
    const aad = AadValidator.init(context, false, M365Login);
    await AadValidator.validate(aad);

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);

    const firstIdentifierUri = "api://first.com/291fc1b5-1146-4d33-b7b8-ec4c441b6b33";
    if (isV3Enabled()) {
      await setAadManifestIdentifierUrisV3(projectPath, firstIdentifierUri);
    } else {
      await setAadManifestIdentifierUris(projectPath, firstIdentifierUri);
    }

    // Deploy all resources without aad manifest
    await CliHelper.deployAll(projectPath, "", env);
    await AadValidator.validate(aad);

    // Deploy all resources include aad manifest
    if (isV3Enabled()) {
      await CliHelper.updateAadManifest(projectPath, "--env dev", env);
    } else {
      await CliHelper.deployAll(projectPath, "--include-aad-manifest", env);
    }
    await AadValidator.validate(aad, firstIdentifierUri);

    const secondIdentifierUri = "api://second.com/291fc1b5-1146-4d33-b7b8-ec4c441b6b33";
    if (isV3Enabled()) {
      await setAadManifestIdentifierUrisV3(projectPath, secondIdentifierUri);
    } else {
      await setAadManifestIdentifierUris(projectPath, secondIdentifierUri);
    }

    // Only deploy aad manifest
    if (isV3Enabled()) {
      await CliHelper.updateAadManifest(projectPath, "--env dev", env);
    } else {
      await CliHelper.deployProject(ResourceToDeploy.AadManifest, projectPath, "", env);
    }
    await AadValidator.validate(aad, secondIdentifierUri);
  });
});
