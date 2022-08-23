// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogProvider } from "@microsoft/teamsfx-api";
import * as path from "path";
import os from "os";
import { exec } from "child_process";

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

function capitalizeFirstLetter(raw: string) {
  return raw.charAt(0).toUpperCase() + raw.slice(1);
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

    exec(command, { cwd: workingDir, env: { ...process.env, ...env } }, (error, stdout, stderr) => {
      logger?.debug(stdout);
      if (error) {
        logger?.error(`Failed to run command: "${command}" on path: "${workingDir}".`);
        if (stderr) {
          logger?.error(stderr);
        }
        logger?.error(error.message);
        reject(error);
      }
      resolve(stdout);
    });
  });
}
