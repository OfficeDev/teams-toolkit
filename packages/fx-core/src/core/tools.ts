// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { exec } from "child_process";
import * as fs from "fs-extra";
import { Dict, Json, Void, ConfigFolderName, ok, Result, FxError, err, ResourceTemplate, VariableDict } from "fx-api";
import { promisify } from "util";
import * as error from "./error";
import Mustache from "mustache";


const execAsync = promisify(exec);

export async function npmInstall(path: string) {
  await execAsync("npm install", {
    cwd: path,
  });
}

export async function ensureUniqueFolder(folderPath: string): Promise<string> {
  let folderId = 1;
  let testFolder = folderPath;

  let pathExists = await fs.pathExists(testFolder);
  while (pathExists) {
    testFolder = `${folderPath}${folderId}`;
    folderId++;

    pathExists = await fs.pathExists(testFolder);
  }

  return testFolder;
}
 
export function replaceTemplateVariable(resourceTemplate:ResourceTemplate, dict?: VariableDict): void {
  if(!dict) return ;
  for (const key of Object.keys(resourceTemplate)) {
    const originalItemValue = resourceTemplate[key];
    if (
      originalItemValue &&
      originalItemValue.startsWith("{{") &&
      originalItemValue.endsWith("}}")
    ) {
      const replaced: string = Mustache.render(originalItemValue, dict);
      resourceTemplate[key] = replaced;
    }
  }
}

export const deepCopy = <T>(target: T): T => {
  if (target === null) {
    return target;
  }
  if (target instanceof Date) {
    return new Date(target.getTime()) as any;
  }
  if (target instanceof Array) {
    const cp = [] as any[];
    (target as any[]).forEach((v) => {
      cp.push(v);
    });
    return cp.map((n: any) => deepCopy<any>(n)) as any;
  }
  if (typeof target === "object" && target !== {}) {
    const cp = { ...(target as { [key: string]: any }) } as {
      [key: string]: any;
    };
    Object.keys(cp).forEach((k) => {
      cp[k] = deepCopy<any>(cp[k]);
    });
    return cp as T;
  }
  return target;
};



export async function initFolder(projectPath:string, appName:string):Promise<Result<Void, FxError>>{
  try {
    await fs.ensureDir(projectPath);
    
    await fs.ensureDir(`${projectPath}/.${ConfigFolderName}`);

    await fs.writeFile(
      `${projectPath}/package.json`,
      JSON.stringify(
        {
          name: appName,
          version: "0.0.1",
          description: "",
          author: "",
          scripts: {
            test: "echo \"Error: no test specified\" && exit 1",
          },
          license: "MIT",
        },
        null,
        4
      )
    );

    await fs.writeFile(
      `${projectPath}/.gitignore`,
      `node_modules\n/.${ConfigFolderName}/*.env\n/.${ConfigFolderName}/*.userdata\n.DS_Store`
    );

    return ok(Void);
  } catch (e) {
    return err(error.WriteFileError(e));
  }
}