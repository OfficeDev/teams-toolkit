// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Middleware, NextFunction } from "@feathersjs/hooks";
import { ConfigFolderName, err, Inputs, Json, ProjectSettings } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as fs from "fs-extra";
import { CoreHookContext, FxCore, NoProjectOpenedError, PathNotExistError } from "..";
import { clearContextAndUserData, deserializeDict } from "../..";
import { serializeDict, sperateSecretData } from "../../common";

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
  const env = await getEnv(confFolderPath, envName as string);

  // Check local AAD object id in userdata
  // If in, means this project is upgraded
  if (checkAppIdInUserData(userData)) {
    return;
  }

  // Check secret in userdata
  // If in, means this project is not upgraded and has run debug before
  if (!checkSecretInUserData(userData)) {
    // Clear and save userdata and env.default.
    clearContextAndUserData(userData, env);
    await saveContextAndUserData(confFolderPath, envName as string, env, userData);
    return;
  }

  const solutionContext: any = env["solution"];
  const teamsAppId = solutionContext["localDebugTeamsAppId"] as string | undefined;

  // Check teamsAppId in env
  // If meets this pattern, means env file is upgraded
  if (!teamsAppId || (teamsAppId!.startsWith("{{") && teamsAppId!.endsWith("}}"))) {
    // Clear userdata and env.default.json
    clearContextAndUserData(userData, env);
    await saveContextAndUserData(confFolderPath, envName as string, env, userData);
  } else {
    // Move info from env.default.json to userdata
    const userDataMoved = sperateSecretData(env);
    await saveContextAndUserData(confFolderPath, envName as string, env, userDataMoved);
  }

  return;
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

export function checkSecretInUserData(userData: Record<string, string>): boolean {
  return userData["fx-resource-aad-app-for-teams.local_clientSecret"] ? true : false;
}

export function checkAppIdInUserData(userData: Record<string, string>): boolean {
  return userData["fx-resource-aad-app-for-teams.local_objectId"] ? true : false;
}

export async function saveContextAndUserData(
  confFolderPath: string,
  envName: string,
  context: Json,
  userData: Record<string, string>
): Promise<void> {
  const jsonFilePath = path.resolve(confFolderPath, `env.${envName}.json`);
  const localDataPath = path.resolve(confFolderPath, `${envName}.userdata`);
  await fs.writeFile(jsonFilePath, JSON.stringify(context, null, 4));
  await fs.writeFile(localDataPath, serializeDict(userData));
}
