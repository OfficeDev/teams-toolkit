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
import {
  InvalidProjectSettingsFileError,
  NoProjectOpenedError,
  PathNotExistError,
  ReadFileError,
} from "../error";
import { globalVars } from "../globalVars";
import { PermissionRequestFileProvider } from "../permissionRequest";
import { CoreHookContext } from "../types";
import { convertProjectSettingsV2ToV3 } from "../../component/migrate";
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
      ctx.result = err(new PathNotExistError(inputs.projectPath));
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
    const settingsFile = isMultiEnvEnabled
      ? getProjectSettingsPath(projectPath)
      : path.resolve(projectPath, `.${ConfigFolderName}`, "settings.json");
    const projectSettings: ProjectSettings = await fs.readJson(settingsFile);
    if (!projectSettings.projectId) {
      projectSettings.projectId = uuid.v4();
      sendTelemetryEvent(Component.core, TelemetryEvent.FillProjectId, {
        [TelemetryProperty.ProjectId]: projectSettings.projectId,
      });
    }
    globalVars.isVS = isVSProject(projectSettings);
    return ok(convertProjectSettingsV2ToV3(projectSettings, projectPath));
  } catch (e) {
    return err(ReadFileError(e));
  }
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

  return StaticPlatforms.includes(inputs.platform) || isCreate;
}

export function getProjectSettingsPath(projectPath: string) {
  return path.resolve(
    projectPath,
    `.${ConfigFolderName}`,
    InputConfigsFolderName,
    ProjectSettingsFileName
  );
}
