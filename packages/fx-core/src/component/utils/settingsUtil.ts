// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Settings,
  Result,
  ok,
  SettingsFolderName,
  SettingsFileName,
  err,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import * as uuid from "uuid";
import { PathNotExistError } from "../../core/error";
import { globalVars } from "../../core/globalVars";

export class SettingsUtils {
  async readSettings(
    projectPath: string,
    ensureTrackingId = true
  ): Promise<Result<Settings, FxError>> {
    const filePath = path.resolve(projectPath, SettingsFolderName, SettingsFileName);
    if (!(await fs.pathExists(filePath))) {
      return err(new PathNotExistError(filePath));
    }
    const settings: Settings = await fs.readJson(filePath);
    if (!settings.trackingId && ensureTrackingId) {
      settings.trackingId = uuid.v4();
      await fs.writeFile(filePath, JSON.stringify(settings, null, 4));
    }
    globalVars.trackingId = settings.trackingId; // set trackingId to globalVars
    return ok(settings);
  }
  async writeSettings(projectPath: string, settings: Settings): Promise<Result<string, FxError>> {
    const filePath = path.resolve(projectPath, SettingsFolderName, SettingsFileName);
    await fs.writeFile(filePath, JSON.stringify(settings, null, 4));
    return ok(filePath);
  }
}

export const settingsUtil = new SettingsUtils();
