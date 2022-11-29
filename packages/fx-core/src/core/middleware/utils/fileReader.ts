// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import fs from "fs-extra";
import { MigrationContext } from "./migrationContext";
import { isObject } from "lodash";
import { FileType, namingConverterV3 } from "../MigrationUtils";

// read json files in states/ folder
export async function readStateFile(context: MigrationContext, filePath: string): Promise<any> {
  const filepath = path.join(context.projectPath, filePath);
  if (await fs.pathExists(filepath)) {
    const obj = fs.readJSON(filepath);
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

// convert any obj names if can be converted
export function jsonObjectNamesConvertV3(obj: any, prefix: string, bicepContent: any) {
  let returnData = "";
  for (const keyName of Object.keys(obj)) {
    returnData += dfs(prefix + keyName, obj[keyName], bicepContent);
  }
  return returnData;
}

function dfs(parentKeyName: string, obj: any, bicepContent: any): string {
  let returnData = "";

  if (isObject(obj)) {
    for (const keyName of Object.keys(obj)) {
      returnData += dfs(parentKeyName + "." + keyName, obj[keyName], bicepContent);
    }
  } else {
    return namingConverterV3(parentKeyName, FileType.STATE, bicepContent) + "=" + obj + "\n";
  }

  return returnData;
}
