// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import lodash from "lodash";
import * as fs from "fs-extra";
import { glob } from "glob";
import { exec } from "child_process";
import { LogProvider } from "@microsoft/teamsfx-api";
import axios, { AxiosInstance } from "axios";

export class Utils {
  static async configure(configurePath: string, map: Map<string, string>): Promise<void> {
    let files: string[] = [];
    const extensions = ["*.json", "*.ts", "*.js", "*.scss", "*.tsx"];

    if (fs.lstatSync(configurePath).isFile()) {
      files = [configurePath];
    } else {
      for (const ext of extensions) {
        files = files.concat(glob.sync(`${configurePath}/**/${ext}`, { nodir: true }));
      }
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

  static normalizeComponentName(name: string): string {
    name = lodash.camelCase(name);
    name = lodash.upperFirst(name);
    return name;
  }

  static async execute(
    command: string,
    title?: string,
    workingDir?: string,
    logProvider?: LogProvider,
    showInOutputWindow = false
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

  static createAxiosInstanceWithToken(accessToken: string): AxiosInstance {
    const axiosInstance = axios.create({
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    return axiosInstance;
  }
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
