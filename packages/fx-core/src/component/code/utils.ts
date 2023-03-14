// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assembleError, err, FxError, LogProvider, ok, Result } from "@microsoft/teamsfx-api";
import * as path from "path";
import os from "os";
import { exec, ExecException } from "child_process";
import { DriverContext } from "../driver/interface/commonArgs";
import fs from "fs-extra";
import { DotenvOutput } from "../utils/envUtil";

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

export async function executeCommand(
  command: string,
  projectPath: string,
  logProvider: LogProvider,
  ui: DriverContext["ui"],
  workingDirectory?: string,
  env?: NodeJS.ProcessEnv,
  shell?: string,
  timeout?: number,
  redirectTo?: string
): Promise<Result<[string, DotenvOutput], FxError>> {
  return new Promise(async (resolve, reject) => {
    let workingDir = workingDirectory || ".";
    workingDir = path.isAbsolute(workingDir) ? workingDir : path.join(projectPath, workingDir);

    // Drive letter should be uppercase, otherwise when we run webpack in exec, it fails to resolve nested dependencies.
    if (os.platform() === "win32") {
      workingDir = capitalizeFirstLetter(path.resolve(workingDir ?? ""));
    }
    const defaultShellMap: any = {
      win32: "powershell",
      darwin: "bash",
      linux: "bash",
    };
    let run = command;
    shell = shell ?? defaultShellMap[process.platform];
    let appendFile: string | undefined = undefined;
    if (redirectTo) {
      appendFile = path.isAbsolute(redirectTo) ? redirectTo : path.join(projectPath, redirectTo);
    }
    const outputs = parseKeyValueInOutput(command);
    if (outputs) {
      resolve(ok(["", outputs]));
      return;
    }
    if (shell === "cmd") {
      run = `%ComSpec% /D /E:ON /V:OFF /S /C "CALL ${command}"`;
    }
    await logProvider.info(`Start to run command: "${command}" on path: "${workingDir}".`);
    if (ui?.runCommand) {
      const uiRes = await ui.runCommand({
        cmd: run,
        workingDirectory: workingDir,
        shell: shell,
        timeout: timeout,
      });
      if (uiRes.isErr()) resolve(err(uiRes.error));
      resolve(ok(["", {}]));
      return;
    } else {
      exec(
        run,
        {
          shell: shell,
          cwd: workingDir,
          encoding: "utf8",
          env: { ...process.env, ...env },
          timeout: timeout,
        },
        async (error, stdout, stderr) => {
          await execCallback(
            resolve,
            error,
            stdout,
            stderr,
            run,
            logProvider,
            workingDir,
            appendFile
          );
        }
      );
    }
  });
}

function parseKeyValueInOutput(command: string): DotenvOutput | undefined {
  if (command.startsWith("::set-output ")) {
    const str = command.substring(12).trim();
    const arr = str.split("=");
    if (arr.length === 2) {
      const key = arr[0].trim();
      const value = arr[1].trim();
      const output: DotenvOutput = { [key]: value };
      return output;
    }
  }
  return undefined;
}

export async function execCallback(
  resolve: any,
  error: ExecException | null,
  stdout: string,
  stderr: string,
  command: string,
  logProvider: LogProvider,
  workingDir: string,
  appendFile?: string
) {
  if (stdout) {
    await logProvider.info(maskSecretValues(stdout));
    if (appendFile) {
      await fs.appendFile(appendFile, stdout);
    }
  }
  if (stderr) {
    await logProvider.error(maskSecretValues(stderr));
    if (appendFile) {
      await fs.appendFile(appendFile, stderr);
    }
  }
  if (error) {
    await logProvider.error(
      `Failed to run command: "${maskSecretValues(command)}" on path: "${workingDir}".`
    );
    resolve(err(assembleError(error)));
  } else {
    resolve(ok([stdout, {}]));
  }
}

export function maskSecretValues(stdout: string): string {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("SECRET_")) {
      const value = process.env[key];
      if (value) {
        stdout = stdout.replace(value, "***");
      }
    }
  }
  return stdout;
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
