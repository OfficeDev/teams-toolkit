// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks";
import { ConfigFolderName, err, Inputs, Json, ProjectSettings } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as fs from "fs-extra";
import { CoreHookContext, FxCore, NoProjectOpenedError, PathNotExistError } from "..";
import { deserializeDict } from "../..";

export const ProjectUpgraderMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
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

  await upgradeContext(inputs);
  await next();
};

export async function upgradeContext(inputs: Inputs) {
  const confFolderPath = path.resolve(inputs.projectPath!, `.${ConfigFolderName}`);
  const settingsFile = path.resolve(confFolderPath, "settings.json");
  const projectSettings: ProjectSettings = await fs.readJson(settingsFile);
  const envName = projectSettings.currentEnv;

  const userData = await getUserData(confFolderPath, envName as string);

  // Check secret in userdata
  if (!userData) {
    // Clear userdata and env.default.json
    return;
  }

  const env = await getEnv(confFolderPath, envName as string);
  const solutionContext: any = env["solution"];
  const teamsAppId = solutionContext["localDebugTeamsAppId"] as string | undefined;
  if (!teamsAppId) {
    // Clear userdata and env.default.json
    return;
  }
  if (teamsAppId!.includes("{{")) {
    // Clear userdata and env.default.json
    console.log(1);
  } else {
    // Move info from env.default.json to userdata
    console.log(2);
  }
}

export async function getUserData(
  confFolderPath: string,
  envName: string
): Promise<Record<string, string>> {
  const localDataPath = path.resolve(confFolderPath, `${envName}.userdata`);
  let dict: Record<string, string>;
  if (await fs.pathExists(localDataPath)) {
    const dictContent = await fs.readFile(localDataPath, "UTF-8");
    dict = deserializeDict(dictContent);
  } else {
    dict = {};
  }

  return dict;
}

export async function getEnv(confFolderPath: string, envName: string): Promise<Json> {
  const jsonFilePath = path.resolve(confFolderPath, `env.${envName}.json`);
  const configJson: Json = await fs.readJson(jsonFilePath);
  return configJson;
}
