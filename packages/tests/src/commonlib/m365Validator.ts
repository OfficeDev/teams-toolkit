// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import {
  AppPackageFolderName,
  ConfigFolderName,
  TemplateFolderName,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as chai from "chai";

const m365ManifestSchema =
  "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json";
const m365ManifestVersion = "1.14";

export class M365Validator {
  public static async validateProjectSettings(projectPath: string) {
    const projectSettingsPath = path.join(
      projectPath,
      `.${ConfigFolderName}`,
      "configs",
      "projectSettings.json"
    );
    const exists = await fs.pathExists(projectSettingsPath);
    chai.assert.isTrue(exists);
    const result = await fs.readJson(projectSettingsPath);
    chai.assert.isTrue(result.isM365);
  }

  public static async validateManifest(projectPath: string) {
    await M365Validator.validateManifestFile(
      path.join(
        projectPath,
        TemplateFolderName,
        AppPackageFolderName,
        "manifest.template.json"
      )
    );
  }

  private static async validateManifestFile(manifestPath: string) {
    const exists = await fs.pathExists(manifestPath);
    chai.assert.isTrue(exists);
    const result = await fs.readJson(manifestPath);
    chai.assert.equal(result.$schema, m365ManifestSchema);
    chai.assert.equal(result.manifestVersion, m365ManifestVersion);
  }
}
