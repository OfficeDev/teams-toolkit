// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Settings, Result, ok } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import * as uuid from "uuid";

export async function readSettings(projectPath: string): Promise<Result<Settings, FxError>> {
  const filePath = path.resolve(projectPath, ".fx", "projectSettings.json");
  const settings: Settings = await fs.readJson(filePath);
  if (!settings.projectId) {
    settings.projectId = uuid.v4();
  }
  return ok(settings);
}

export async function writeSettings(
  projectPath: string,
  settings: Settings
): Promise<Result<string, FxError>> {
  const filePath = path.resolve(projectPath, ".fx", "projectSettings.json");
  await fs.writeFile(filePath, JSON.stringify(settings, null, 4));
  return ok(filePath);
}

export class SettingsUtils {
  readSettings = readSettings;
  writeSettings = writeSettings;
}

export const settingsUtil = new SettingsUtils();
