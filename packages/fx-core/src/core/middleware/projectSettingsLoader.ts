// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as uuid from "uuid";

import {
  ConfigFolderName,
  FxError,
  Inputs,
  Result,
  Stage,
  StaticPlatforms,
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
import { MetadataV2, MetadataV3 } from "../../common/versionMetadata";
import { convertProjectSettingsV2ToV3 } from "../../component/migrate";
import { settingsUtil } from "../../component/utils/settingsUtil";
import { NoProjectOpenedError } from "../error";
import { globalVars } from "../globalVars";
import { CoreHookContext } from "../types";
import { ReadFileError } from "../../error/common";

export async function loadProjectSettings(
  inputs: Inputs,
  isMultiEnvEnabled = false
): Promise<Result<any, FxError>> {
  if (!inputs.projectPath) {
    return err(new NoProjectOpenedError());
  }
  return await loadProjectSettingsByProjectPath(inputs.projectPath, isMultiEnvEnabled);
}

export async function loadProjectSettingsByProjectPath(
  projectPath: string,
  isMultiEnvEnabled = false
): Promise<Result<any, FxError>> {
  try {
    const readSettingsResult = await settingsUtil.readSettings(projectPath, true);
    if (readSettingsResult.isOk()) {
      const projectSettings: any = {
        projectId: readSettingsResult.value.trackingId,
        version: readSettingsResult.value.version,
      };
      return ok(projectSettings);
    } else {
      return err(readSettingsResult.error);
    }
  } catch (e) {
    return err(new ReadFileError(e, "projectSettingsLoader"));
  }
}

// export this for V2 -> V3 migration purpose
export async function loadProjectSettingsByProjectPathV2(
  projectPath: string,
  isMultiEnvEnabled = false,
  onlyV2 = false
): Promise<Result<any, FxError>> {
  let settingsFile;
  if (onlyV2) {
    settingsFile = getProjectSettingPathV2(projectPath);
  } else {
    settingsFile = isMultiEnvEnabled
      ? getProjectSettingsPath(projectPath)
      : path.resolve(projectPath, `.${ConfigFolderName}`, "settings.json");
  }

  const projectSettings: any = await fs.readJson(settingsFile);
  if (!projectSettings.projectId) {
    projectSettings.projectId = uuid.v4();
    sendTelemetryEvent(Component.core, TelemetryEvent.FillProjectId, {
      [TelemetryProperty.ProjectId]: projectSettings.projectId,
    });
  }
  globalVars.isVS = isVSProject(projectSettings);
  return ok(convertProjectSettingsV2ToV3(projectSettings, projectPath));
}

export function shouldIgnored(ctx: CoreHookContext): boolean {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const method = ctx.method;

  let isCreate = false;
  if (method === "getQuestions") {
    const task = ctx.arguments[0] as Stage;
    isCreate = task === Stage.create;
  }

  return StaticPlatforms.includes(inputs.platform) || isCreate || inputs.ignoreLockByUT;
}

export function getProjectSettingsPath(projectPath: string): string {
  return path.resolve(projectPath, MetadataV3.configFile);
}

export function getProjectSettingPathV2(projectPath: string): string {
  return path.resolve(projectPath, `.${ConfigFolderName}`, "configs", MetadataV2.configFile);
}
