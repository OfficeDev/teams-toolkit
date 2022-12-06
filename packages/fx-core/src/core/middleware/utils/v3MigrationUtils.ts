// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import fs from "fs-extra";
import { MigrationContext } from "./migrationContext";
import { isObject } from "lodash";
import { FileType, namingConverterV3 } from "./MigrationUtils";
import { EOL } from "os";
import { Inputs } from "@microsoft/teamsfx-api";
import { CoreHookContext } from "../../types";
import { getProjectSettingPathV3, getProjectSettingPathV2 } from "../projectSettingsLoader";

// read json files in states/ folder
export async function readJsonFile(context: MigrationContext, filePath: string): Promise<any> {
  const filepath = path.join(context.projectPath, filePath);
  if (await fs.pathExists(filepath)) {
    const obj = fs.readJson(filepath);
    return obj;
  }
}

// read bicep file content
export function readBicepContent(context: MigrationContext): any {
  return fs.readFileSync(
    path.join(context.projectPath, "templates", "azure", "provision.bicep"),
    "utf8"
  );
}

// read file names list under the given path
export function fsReadDirSync(context: MigrationContext, _path: string): string[] {
  const dirPath = path.join(context.projectPath, _path);
  return fs.readdirSync(dirPath);
}

// convert any obj names if can be converted (used in states and configs migration)
export function jsonObjectNamesConvertV3(
  obj: any,
  prefix: string,
  filetype: FileType,
  bicepContent: any
) {
  let returnData = "";
  for (const keyName of Object.keys(obj)) {
    returnData += dfs(prefix + keyName, obj[keyName], filetype, bicepContent);
  }
  return returnData;
}

// env variables in this list will be only convert into .env.{env} when migrating {env}.userdata
const skipList = [
  "state.fx-resource-aad-app-for-teams.clientSecret",
  "state.fx-resource-bot.botPassword",
  "state.fx-resource-apim.apimClientAADClientSecret",
  "state.fx-resource-azure-sql.adminPassword",
];

function dfs(parentKeyName: string, obj: any, filetype: FileType, bicepContent: any): string {
  let returnData = "";

  if (isObject(obj)) {
    for (const keyName of Object.keys(obj)) {
      returnData += dfs(parentKeyName + "." + keyName, obj[keyName], filetype, bicepContent);
    }
  } else if (!skipList.includes(parentKeyName)) {
    const res = namingConverterV3(parentKeyName, filetype, bicepContent);
    if (res.isOk()) return res.value + "=" + obj + EOL;
  } else return "";

  return returnData;
}

export async function getProjectVersion(ctx: CoreHookContext): Promise<string> {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const projectPath = inputs.projectPath as string;
  const v3path = getProjectSettingPathV3(projectPath);
  if (await fs.pathExists(v3path)) {
    const settings = await fs.readJson(v3path);
    return settings.version || "3.0.0";
  }
  const v2path = getProjectSettingPathV2(projectPath);
  if (await fs.pathExists(v2path)) {
    const settings = await fs.readJson(v2path);
    if (settings.version) {
      return settings.version;
    }
  }
  return "0.0.0";
}

export async function readAndConvertUserdata(
  context: MigrationContext,
  filePath: string,
  bicepContent: any
): Promise<string> {
  let returnAnswer = "";

  const userdataContent = await fs.readFileSync(path.join(context.projectPath, filePath), "utf8");
  const lines = userdataContent.split(EOL);
  for (const line of lines) {
    if (line && line != "") {
      // in case that there are "="s in secrets
      const key_value = line.split("=");
      const res = await namingConverterV3("state." + key_value[0], FileType.USERDATA, bicepContent);
      if (res.isOk()) returnAnswer += res.value + "=" + key_value.slice(1).join("=") + EOL;
    }
  }

  return returnAnswer;
}
