// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from "path";
import fs from "fs-extra";
import { globalVars } from "../core/globalVars";

export async function getProjectTemplatesFolderPath(projectPath: string): Promise<string> {
  if (globalVars.isVS) {
    const bicepFolder = path.join(projectPath, "templates", "azure");
    const appFolder = path.join(projectPath, "templates", "appPackage");
    if ((await fs.pathExists(bicepFolder)) || (await fs.pathExists(appFolder))) {
      await fs.rename(path.join(projectPath, "templates"), path.join(projectPath, "Templates"));
    }
    return path.resolve(projectPath, "Templates");
  }
  return path.resolve(projectPath, "templates");
}
