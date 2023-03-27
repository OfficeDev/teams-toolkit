// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as uuid from "uuid";

import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import {
  ConfigFolderName,
  err,
  FxError,
  InputConfigsFolderName,
  Inputs,
  ok,
  ProjectSettings,
  ProjectSettingsFileName,
  Result,
  SolutionContext,
  Stage,
  StaticPlatforms,
  Tools,
} from "@microsoft/teamsfx-api";

import { isVSProject, validateProjectSettings } from "../../common/projectSettingsHelper";
import {
  Component,
  sendTelemetryEvent,
  TelemetryEvent,
  TelemetryProperty,
} from "../../common/telemetry";
import { createV2Context, isV3Enabled } from "../../common/tools";
import { LocalCrypto } from "../crypto";
import { newEnvInfo } from "../environment";
import { InvalidProjectSettingsFileError, NoProjectOpenedError, ReadFileError } from "../error";
import { globalVars } from "../globalVars";
import { PermissionRequestFileProvider } from "../permissionRequest";
import { CoreHookContext } from "../types";
import { convertProjectSettingsV2ToV3 } from "../../component/migrate";
import { MetadataV3 } from "../../common/versionMetadata";
import { settingsUtil } from "../../component/utils/settingsUtil";
import { FileNotFoundError } from "../../error/common";

export const ProjectSettingsLoaderMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!shouldIgnored(ctx)) {
    if (!inputs.projectPath) {
      ctx.result = err(new NoProjectOpenedError());
      return;
    }
    const projectPathExist = await fs.pathExists(inputs.projectPath);
    if (!projectPathExist) {
      ctx.result = err(new FileNotFoundError("ProjectSettingsLoaderMW", inputs.projectPath));
      return;
    }
    const loadRes = await loadProjectSettings(inputs, true);
    if (loadRes.isErr()) {
      ctx.result = err(loadRes.error);
      return;
    }

    const projectSettings = loadRes.value;

    const validRes = validateProjectSettings(projectSettings);
    if (validRes) {
      ctx.result = err(new InvalidProjectSettingsFileError(validRes));
      return;
    }
    ctx.projectSettings = projectSettings;
    (ctx.self as any).isFromSample = projectSettings.isFromSample === true;
    (ctx.self as any).settingsVersion = projectSettings.version;
    (ctx.self as any).tools.cryptoProvider = new LocalCrypto(projectSettings.projectId);
    ctx.contextV2 = createV2Context(projectSettings);
    // set global variable once project settings is loaded
    globalVars.isVS = isVSProject(projectSettings);
  }

  await next();
};

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

export async function newSolutionContext(tools: Tools, inputs: Inputs): Promise<SolutionContext> {
  const projectSettings: ProjectSettings = {
    appName: "",
    programmingLanguage: "",
    projectId: uuid.v4(),
    solutionSettings: {
      name: "fx-solution-azure",
      version: "1.0.0",
    },
  };
  const solutionContext: SolutionContext = {
    projectSettings: projectSettings,
    envInfo: newEnvInfo(),
    root: inputs.projectPath || "",
    ...tools,
    ...tools.tokenProvider,
    answers: inputs,
    cryptoProvider: new LocalCrypto(projectSettings.projectId),
    permissionRequestProvider: inputs.projectPath
      ? new PermissionRequestFileProvider(inputs.projectPath)
      : undefined,
  };
  return solutionContext;
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
