// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigFolderName,
  Core,
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
import { CoreHookContext, FxCore } from "../..";
import {
  InvalidProjectError,
  NoProjectOpenedError,
  PathNotExistError,
  ReadFileError,
} from "../error";
import * as path from "path";
import * as fs from "fs-extra";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { newEnvInfo, validateSettings } from "../tools";
import * as uuid from "uuid";
import { LocalCrypto } from "../crypto";
import { PluginNames } from "../../plugins/solution/fx-solution/constants";
import { PermissionRequestFileProvider } from "../permissionRequest";
import { readJson } from "../../common/fileUtils";
import { isMultiEnvEnabled } from "../../common";
import { CoreHookContextV2, FxCoreV2 } from "../v2";

export const ProjectSettingsLoaderMW: Middleware = async (
  ctx: CoreHookContext | CoreHookContextV2,
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

    const [projectSettings, projectIdMissing] = loadRes.value;

    const validRes = validateSettings(projectSettings);
    if (validRes) {
      ctx.result = err(InvalidProjectError(validRes));
      return;
    }

    ctx.projectSettings = projectSettings;
    ctx.projectIdMissing = projectIdMissing;
    if ((ctx.self as Core).version === "2") {
      ctx.contextV2 = (ctx.self as FxCoreV2).createV2Context(projectSettings);
    }
  }

  await next();
};

export async function loadProjectSettings(
  inputs: Inputs
): Promise<Result<[ProjectSettings, boolean], FxError>> {
  try {
    if (!inputs.projectPath) {
      return err(NoProjectOpenedError());
    }

    const confFolderPath = path.resolve(inputs.projectPath, `.${ConfigFolderName}`);
    const settingsFile = isMultiEnvEnabled()
      ? path.resolve(confFolderPath, InputConfigsFolderName, ProjectSettingsFileName)
      : path.resolve(confFolderPath, "settings.json");
    const projectSettings: ProjectSettings = await readJson(settingsFile);
    let projectIdMissing = false;
    if (!projectSettings.projectId) {
      projectSettings.projectId = uuid.v4();
      projectIdMissing = true;
    }
    if (
      projectSettings.solutionSettings &&
      projectSettings.solutionSettings.activeResourcePlugins &&
      !projectSettings.solutionSettings.activeResourcePlugins.includes(PluginNames.APPST)
    ) {
      projectSettings.solutionSettings.activeResourcePlugins.push(PluginNames.APPST);
    }

    return ok([projectSettings, projectIdMissing]);
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

export function shouldIgnored(ctx: CoreHookContext | CoreHookContextV2): boolean {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const method = ctx.method;

  let isCreate = false;
  if (method === "getQuestions") {
    const task = ctx.arguments[0] as Stage;
    isCreate = task === Stage.create;
  }

  return inputs.ignoreTypeCheck === true || StaticPlatforms.includes(inputs.platform) || isCreate;
}
