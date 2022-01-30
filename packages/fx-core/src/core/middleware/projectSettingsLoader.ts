// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
import * as fs from "fs-extra";
import * as path from "path";
import * as uuid from "uuid";
import { createV2Context, isV3, TOOLS } from "..";
import { CoreHookContext, FxCore } from "../..";
import { readJson } from "../../common/fileUtils";
import { PluginNames } from "../../plugins/solution/fx-solution/constants";
import { LocalCrypto } from "../crypto";
import {
  InvalidProjectSettingsFileError,
  NoProjectOpenedError,
  PathNotExistError,
  ReadFileError,
} from "../error";
import { PermissionRequestFileProvider } from "../permissionRequest";
import { newEnvInfo, validateSettings } from "../tools";

export const ProjectSettingsLoaderMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!shouldIgnored(ctx)) {
    if (!inputs.projectPath) {
      ctx.result = err(NoProjectOpenedError());
      return;
    }
    const projectPathExist = await fs.pathExists(inputs.projectPath);
    if (!projectPathExist) {
      ctx.result = err(PathNotExistError(inputs.projectPath));
      return;
    }
    const loadRes = await loadProjectSettings(inputs);
    if (loadRes.isErr()) {
      ctx.result = err(loadRes.error);
      return;
    }

    const projectSettings = loadRes.value;

    const validRes = validateSettings(projectSettings);
    if (validRes) {
      ctx.result = err(
        InvalidProjectSettingsFileError(
          `reason: ${validRes}, projectSettings: ${JSON.stringify(projectSettings)}`
        )
      );
      return;
    }

    ctx.projectSettings = projectSettings;
    (ctx.self as FxCore).isFromSample = projectSettings.isFromSample === true;
    (ctx.self as FxCore).settingsVersion = projectSettings.version;
    (ctx.self as FxCore).tools.cryptoProvider = new LocalCrypto(projectSettings.projectId);
    ctx.contextV2 = createV2Context(projectSettings);
  }

  await next();
};

export async function loadProjectSettings(
  inputs: Inputs
): Promise<Result<ProjectSettings, FxError>> {
  try {
    if (!inputs.projectPath) {
      return err(NoProjectOpenedError());
    }
    const settingsFile = getProjectSettingsPath(inputs.projectPath);
    const projectSettings: ProjectSettings = await fs.readJson(settingsFile);
    if (!projectSettings.projectId) {
      projectSettings.projectId = uuid.v4();
    }
    if (
      !isV3() &&
      projectSettings.solutionSettings &&
      projectSettings.solutionSettings.activeResourcePlugins &&
      !projectSettings.solutionSettings.activeResourcePlugins.includes(PluginNames.APPST)
    ) {
      projectSettings.solutionSettings.activeResourcePlugins.push(PluginNames.APPST);
    }
    return ok(projectSettings);
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
