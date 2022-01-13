// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import {
  ConfigFolderName,
  err,
  InputConfigsFolderName,
  Inputs,
  ProjectSettings,
  ProjectSettingsFileName,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import * as uuid from "uuid";
import { LocalCrypto } from "../crypto";
import { InvalidProjectError, NoProjectOpenedError, PathNotExistError } from "../error";
import { TOOLS } from "../globalVars";
import { createV2Context, validateSettings } from "../tools";
import { CoreHookContext } from "./CoreHookContext";

export const ProjectSettingsLoaderMW_V3: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    ctx.result = err(NoProjectOpenedError());
    return;
  }
  const projectPathExist = await fs.pathExists(inputs.projectPath);
  if (!projectPathExist) {
    ctx.result = err(PathNotExistError(inputs.projectPath));
    return;
  }
  const settingsFile = getProjectSettingsPath(inputs.projectPath);
  const projectSettings: ProjectSettings = await fs.readJson(settingsFile);
  if (!projectSettings.projectId) {
    projectSettings.projectId = uuid.v4();
  }
  const validRes = validateSettings(projectSettings);
  if (validRes) {
    ctx.result = err(InvalidProjectError(validRes));
    return;
  }
  ctx.projectSettings = projectSettings;
  (ctx.self as any).isFromSample = projectSettings.isFromSample === true;
  (ctx.self as any).settingsVersion = projectSettings.version;
  TOOLS.cryptoProvider = new LocalCrypto(projectSettings.projectId);
  ctx.contextV2 = createV2Context(projectSettings);
  await next();
};

export function getProjectSettingsPath(projectPath: string) {
  return path.resolve(
    projectPath,
    `.${ConfigFolderName}`,
    InputConfigsFolderName,
    ProjectSettingsFileName
  );
}
