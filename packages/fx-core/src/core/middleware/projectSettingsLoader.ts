// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as uuid from "uuid";

import {
  ConfigFolderName,
  FxError,
  InputConfigsFolderName,
  Inputs,
  ProjectSettings,
  ProjectSettingsFileName,
  Result,
  err,
  ok,
} from "@microsoft/teamsfx-api";

import { isVSProject } from "../../common/projectSettingsHelper";
import {
  Component,
  TelemetryEvent,
  TelemetryProperty,
  sendTelemetryEvent,
} from "../../common/telemetry";
import { isV3Enabled } from "../../common/tools";
import { MetadataV3 } from "../../common/versionMetadata";
import { convertProjectSettingsV2ToV3 } from "../../component/migrate";
import { settingsUtil } from "../../component/utils/settingsUtil";
import { NoProjectOpenedError, ReadFileError } from "../error";
import { globalVars } from "../globalVars";

export async function loadProjectSettings(
  inputs: Inputs,
  isMultiEnvEnabled = false
): Promise<Result<ProjectSettings, FxError>> {
  if (!inputs.projectPath) {
    return err(new NoProjectOpenedError());
  }
  return await loadProjectSettingsByProjectPath(inputs.projectPath, isMultiEnvEnabled);
}

export async function loadProjectSettingsByProjectPath(
  projectPath: string,
  isMultiEnvEnabled = false
): Promise<Result<ProjectSettings, FxError>> {
  try {
    if (isV3Enabled()) {
      const readSettingsResult = await settingsUtil.readSettings(projectPath, true);
      if (readSettingsResult.isOk()) {
        const projectSettings: ProjectSettings = {
          projectId: readSettingsResult.value.trackingId,
          version: readSettingsResult.value.version,
        };
        return ok(projectSettings);
      } else {
        return err(readSettingsResult.error);
      }
    } else {
      return await loadProjectSettingsByProjectPathV2(projectPath, isMultiEnvEnabled);
    }
  } catch (e) {
    return err(ReadFileError(e));
  }
}

// export this for V2 -> V3 migration purpose
export async function loadProjectSettingsByProjectPathV2(
  projectPath: string,
  isMultiEnvEnabled = false,
  onlyV2 = false
): Promise<Result<ProjectSettings, FxError>> {
  let settingsFile;
  if (onlyV2) {
    settingsFile = getProjectSettingPathV2(projectPath);
  } else {
    settingsFile = isMultiEnvEnabled
      ? getProjectSettingsPath(projectPath)
      : path.resolve(projectPath, `.${ConfigFolderName}`, "settings.json");
  }

  const projectSettings: ProjectSettings = await fs.readJson(settingsFile);
  if (!projectSettings.projectId) {
    projectSettings.projectId = uuid.v4();
    sendTelemetryEvent(Component.core, TelemetryEvent.FillProjectId, {
      [TelemetryProperty.ProjectId]: projectSettings.projectId,
    });
  }
  globalVars.isVS = isVSProject(projectSettings);
  return ok(convertProjectSettingsV2ToV3(projectSettings, projectPath));
}

export function getProjectSettingsPath(projectPath: string): string {
  if (isV3Enabled()) {
    return getProjectSettingPathV3(projectPath);
  } else {
    return getProjectSettingPathV2(projectPath);
  }
}

export function getProjectSettingPathV3(projectPath: string): string {
  return path.resolve(projectPath, MetadataV3.configFile);
}

export function getProjectSettingPathV2(projectPath: string): string {
  return path.resolve(
    projectPath,
    `.${ConfigFolderName}`,
    InputConfigsFolderName,
    ProjectSettingsFileName
  );
}
