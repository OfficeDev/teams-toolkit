// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import fs from "fs-extra";
import { MigrationContext } from "./migrationContext";

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
