// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import lodash from "lodash";
import * as fs from "fs-extra";
import { glob } from "glob";
import { exec } from "child_process";
import { LogProvider } from "teamsfx-api";

export async function configure(
  dir: string,
  map: Map<string, string>
): Promise<void> {
  let files: string[] = [];
  const extensions = ["*.json", "*.ts", "*.js", "*.scss"];

  for (let ext of extensions) {
    files = files.concat(glob.sync(`${dir}/**/${ext}`, { nodir: true }));
  }

  files.forEach(async function (file) {
    let content = (await fs.readFile(file)).toString();
    map.forEach((value, key) => {
      const reg = new RegExp(key, "g");
      content = content.replace(reg, value);
    });
    await fs.writeFile(file, content);
  });
}

export function normalizeComponentName(name: string): string {
  name = lodash.camelCase(name);
  name = lodash.upperFirst(name);
  return name;
}

export async function execute(
  command: string,
  title?: string,
  workingDir?: string,
  logProvider?: LogProvider,
  showInOutputWindow: boolean = false
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (showInOutputWindow) {
      logProvider?.info(`[${title}] Start to run command: "${command}".`);
    }

    exec(command, { cwd: workingDir }, (error, standardOutput) => {
      if (showInOutputWindow) {
        logProvider?.debug(`[${title}]${standardOutput}`);
      }
      if (error) {
        if (showInOutputWindow) {
          logProvider?.error(`[${title}] Failed to run command: "${command}".`);
          logProvider?.error(error.message);
        }
        reject(error);
        return;
      }
      resolve(standardOutput);
    });
  });
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
