// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Renlong Tu <rentu@microsoft.com>
 */

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
  EnvContants,
  PluginId,
  ProjectSettingKey,
  ResourceToDeploy,
  TestFilePath,
} from "../../commonlib/constants";
import fs from "fs-extra";
import { expect } from "chai";
import { AadValidator, FrontendValidator } from "../../commonlib";
import M365Login from "../../../src/commonlib/m365Login";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";
import * as dotenv from "dotenv";

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

    if (isV3Enabled()) {
      const aadTemplatePath = path.join(projectPath, TestFilePath.aadManifestTemplateFileNameV3);
      {
        expect(await fs.pathExists(aadTemplatePath)).to.be.true;
        await CliHelper.provisionProject(projectPath, "", env);
      }

      await CliHelper.provisionProject(projectPath, "", env);
      const aadManifestPath = path.join(projectPath, "build", "aad.manifest.dev.json");
      const aadObject = JSON.parse(fs.readFileSync(aadManifestPath, "utf8"));

      const aad: any = {
        clientId: aadObject.appId,
        objectId: aadObject.id,
        oauth2PermissionScopeId: aadObject.oauth2Permissions[0].id,
        applicationIdUris: aadObject.identifierUris[0],
      };

      await AadValidator.validate(aad);

      // Validate Tab Frontend
      const envFile = await fs.readFile(path.join(projectPath, "teamsfx/.env.dev"), "UTF-8");
      const envs = dotenv.parse(envFile);
      const frontendObject = {
        storageName: FrontendValidator.getStorageAccountName(
          envs[EnvContants.TAB_AZURE_STORAGE_RESOURCE_ID]
        ),
        containerName: "$web",
      };
      await FrontendValidator.validateProvisionV3(
        frontendObject,
        envs[EnvContants.AZURE_SUBSCRIPTION_ID],
        envs[EnvContants.AZURE_RESOURCE_GROUP_NAME]
      );

      // Deploy all resources without aad manifest
      await CliHelper.deployAll(projectPath, "", env);
      await AadValidator.validate(aad);

      const firstIdentifierUri = "api://first.com/291fc1b5-1146-4d33-b7b8-ec4c441b6b33";
      const aadTemplate = await fs.readJSON(aadManifestPath);
      aadTemplate.identifierUris = [firstIdentifierUri];
      await fs.writeJSON(aadManifestPath, aadTemplate, { spaces: 4 });

      // Deploy all resources without aad manifest
      await CliHelper.deployAll(projectPath, "", env);
      await AadValidator.validate(aad);

      // Deploy all resources include aad manifest
      await CliHelper.deployAll(projectPath, "--include-aad-manifest", env);
      await AadValidator.validate(aad, undefined, undefined, firstIdentifierUri);

      const secondIdentifierUri = "api://second.com/291fc1b5-1146-4d33-b7b8-ec4c441b6b33";
      aadTemplate.identifierUris = [secondIdentifierUri];
      await fs.writeJSON(aadManifestPath, aadTemplate, { spaces: 4 });

      // Only deploy aad manifest
      await CliHelper.deployProject(ResourceToDeploy.AadManifest, projectPath, "", env);
      await AadValidator.validate(aad, secondIdentifierUri);

      // Only deploy aad manifest
      await CliHelper.deployProject(ResourceToDeploy.AadManifest, projectPath, "", env);
      await AadValidator.validate(aad, undefined, undefined, secondIdentifierUri);
    } else {
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

        const aadTemplatePath = path.join(
          projectPath,
          TestFilePath.manifestFolder,
          TestFilePath.aadManifestTemplateFileName
        );
        expect(await fs.pathExists(aadTemplatePath)).to.be.true;

        const permissionJsonFilePath = path.join(projectPath, TestFilePath.permissionJsonFileName);
        expect(await fs.pathExists(permissionJsonFilePath)).to.be.false;
      }

      await CliHelper.provisionProject(projectPath, "", env);

      const context = await readContextMultiEnv(projectPath, "dev");

      // Validate Aad App
      const aad = AadValidator.init(context, false, M365Login);
      await AadValidator.validate(aad);

      // Validate Tab Frontend
      const frontend = FrontendValidator.init(context);
      await FrontendValidator.validateProvision(frontend);

      const firstIdentifierUri = "api://first.com/291fc1b5-1146-4d33-b7b8-ec4c441b6b33";
      await setAadManifestIdentifierUris(projectPath, firstIdentifierUri);

      // Deploy all resources without aad manifest
      await CliHelper.deployAll(projectPath, "", env);
      await AadValidator.validate(aad);

      // Deploy all resources include aad manifest
      await CliHelper.deployAll(projectPath, "--include-aad-manifest", env);
      await AadValidator.validate(aad, firstIdentifierUri);

      const secondIdentifierUri = "api://second.com/291fc1b5-1146-4d33-b7b8-ec4c441b6b33";
      await setAadManifestIdentifierUris(projectPath, secondIdentifierUri);

      // Only deploy aad manifest
      await CliHelper.deployProject(ResourceToDeploy.AadManifest, projectPath, "", env);
      await AadValidator.validate(aad, secondIdentifierUri);
    }
  });
});
