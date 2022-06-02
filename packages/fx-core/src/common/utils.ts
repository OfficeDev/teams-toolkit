// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from "path";
import fs from "fs-extra";

export async function getProjectTemplatesFolderName(
  projectPath: string,
  isVs: boolean
): Promise<string> {
  if (isVs) {
    const bicepFolder = path.join(projectPath, "templates", "azure");
    const appFolder = path.join(projectPath, "templates", "appPackage");
    if ((await fs.pathExists(bicepFolder)) || (await fs.pathExists(appFolder))) {
      await fs.rename(path.join(projectPath, "templates"), path.join(projectPath, "Templates"));
    }
    return "Templates";
  }
  return "templates";
}
