// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import {
  AppPackageFolderName,
  ConfigFolderName,
  InputConfigsFolderName,
  ProjectSettingsFileName,
  TemplateFolderName,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as chai from "chai";
import { environmentManager } from "@microsoft/teamsfx-core";
import { readContextMultiEnv } from "../e2e/commonUtils";
import { PluginId, StateConfigKey } from "./constants";

const defaultEndpoint = "https://localhost:3000";
const manifestTemplateName = "manifest.template.json";

export class ExistingAppValidator {
  public static async validateProjectSettings(projectPath: string) {
    const projectSettingsPath = path.join(
      projectPath,
      `.${ConfigFolderName}`,
      InputConfigsFolderName,
      ProjectSettingsFileName
    );
    const exists = await fs.pathExists(projectSettingsPath);
    chai.assert.isTrue(exists);

    const result = await fs.readJson(projectSettingsPath);
    chai.assert.notExists(result.solutionSettings);
  }

  public static async validateEnvConfig(projectPath: string, env?: string) {
    const envConfigPath = environmentManager.getEnvConfigPath(
      env ?? environmentManager.getLocalEnvName(),
      projectPath
    );
    const exists = await fs.pathExists(envConfigPath);
    chai.assert.isTrue(exists);

    const result = await fs.readJson(envConfigPath);
    chai.assert.equal(result.manifest.tabContentUrl, defaultEndpoint);
  }

  public static async validateManifest(projectPath: string) {
    const manifestPath = path.join(
      projectPath,
      TemplateFolderName,
      AppPackageFolderName,
      manifestTemplateName
    );
    const exists = await fs.pathExists(manifestPath);
    chai.assert.isTrue(exists);
    const result = await fs.readJson(manifestPath);
    chai.assert.lengthOf(result.staticTabs, 1);
    chai.assert.isEmpty(result.bots);
    chai.assert.isEmpty(result.configurableTabs);
  }

  public static async validateStateFile(projectPath: string, env?: string) {
    const context = await readContextMultiEnv(
      projectPath,
      env ?? environmentManager.getDefaultEnvName()
    );
    chai.assert.exists(context[PluginId.AppStudio]);
    chai.assert.isNotEmpty(context[PluginId.AppStudio][StateConfigKey.teamsAppId]);
  }
}
