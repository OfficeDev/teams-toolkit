// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogProvider } from "@microsoft/teamsfx-api";
import { exec } from "child_process";
import os from "os";
import * as path from "path";
import { capitalizeFirstLetter } from "../driver/script/scriptDriver";

export function convertToLangKey(programmingLanguage: string): string {
  switch (programmingLanguage) {
    case "javascript": {
      return "js";
    }
    case "typescript": {
      return "ts";
    }
    case "csharp": {
      return "csharp";
    }
    default: {
      return "js";
    }
  }
}

export function execute(
  command: string,
  workingDir?: string,
  logger?: LogProvider,
  env?: NodeJS.ProcessEnv
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Drive letter should be uppercase, otherwise when we run webpack in exec, it fails to resolve nested dependencies.
    if (os.platform() === "win32") {
      workingDir = capitalizeFirstLetter(path.resolve(workingDir ?? ""));
    }

    logger?.info(`Start to run command: "${command}" on path: "${workingDir}".`);

    exec(
      command,
      { cwd: workingDir, env: { ...process.env, ...env } },
      async (error, stdout, stderr) => {
        if (error) {
          await logger?.error(`Failed to run command: "${command}" on path: "${workingDir}".`);
          if (stdout) {
            await logger?.error(stdout);
          }
          if (stderr) {
            await logger?.error(stderr);
          }
          reject(error);
        }
        if (stdout) {
          await logger?.debug(stdout);
        }
        resolve(stdout);
      }
    );
  });
}
