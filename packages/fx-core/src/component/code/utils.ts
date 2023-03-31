// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assembleError, err, FxError, LogProvider, ok, Result } from "@microsoft/teamsfx-api";
import * as path from "path";
import os from "os";
import { exec } from "child_process";
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
    const defaultOsToShellMap: any = {
      win32: "powershell",
      darwin: "bash",
      linux: "bash",
    };
    // const shellToOsMap: any = {
    //   cmd: ["win32"],
    //   powershell: ["win32"],
    //   pwsh: ["win32"],
    //   sh: ["linux", "darwin"],
    //   bash: ["linux", "darwin"],
    // };
    let run = command;
    shell = shell ?? defaultOsToShellMap[process.platform];
    let appendFile: string | undefined = undefined;
    if (redirectTo) {
      appendFile = path.isAbsolute(redirectTo) ? redirectTo : path.join(projectPath, redirectTo);
    }
    if (shell === "cmd") {
      run = `%ComSpec% /D /E:ON /V:OFF /S /C "CALL ${command}"`;
    }
    // if (!shell) {
    //   await logProvider.warning(
    //     `Failed to run command: "${command}" on path: "${workingDir}", shell type unspecified`
    //   );
    //   resolve(ok(["", {}]));
    //   return;
    // }
    // const osList = shellToOsMap[shell];
    // if (!osList.includes(os.platform())) {
    //   await logProvider.warning(
    //     `Failed to run command: "${command}" on path: "${workingDir}", shell ${shell} can not be executed in os ${os}`
    //   );
    //   resolve(ok(["", {}]));
    //   return;
    // }
    await logProvider.info(`Start to run command: "${command}" on path: "${workingDir}".`);
    // if (ui?.runCommand) {
    //   const uiRes = await ui.runCommand({
    //     cmd: run,
    //     workingDirectory: workingDir,
    //     shell: shell,
    //     timeout: timeout,
    //   });
    //   if (uiRes.isErr()) resolve(err(uiRes.error));
    //   resolve(ok(["", {}]));
    //   return;
    // } else {
    const outputStrings: string[] = [];
    const cp = exec(
      run,
      {
        shell: shell,
        cwd: workingDir,
        encoding: "utf8",
        env: { ...process.env, ...env },
        timeout: timeout,
      },
      async (error, stdout, stderr) => {
        if (error) {
          await logProvider.error(
            `Failed to run command: "${maskSecretValues(command)}" on path: "${workingDir}".`
          );
          resolve(err(assembleError(error)));
        } else {
          // parse '::set-output' patterns
          const outputString = outputStrings.join("");
          const outputObject = parseSetOutputCommand(outputString);
          resolve(ok([outputString, outputObject]));
        }
      }
    );
    const dataHandler = (data: string | Buffer) => {
      if (appendFile) {
        fs.appendFileSync(appendFile, data);
      }
      outputStrings.push(data as string);
    };
    cp.stdout?.on("data", (data: string | Buffer) => {
      logProvider.info(` [script action stdout] ${maskSecretValues(data as string)}`);
      dataHandler(data);
    });
    cp.stderr?.on("data", (data: string | Buffer) => {
      logProvider.warning(` [script action stderr] ${maskSecretValues(data as string)}`);
      dataHandler(data);
    });
    // }
  });
}

function parseSetOutputCommand(stdout: string): DotenvOutput {
  const lines = stdout.toString().replace(/\r\n?/gm, "\n").split(/\r?\n/);
  const output: DotenvOutput = {};
  for (const line of lines) {
    if (line.startsWith("::set-output ") || line.startsWith("set-teamsfx-env ")) {
      const str = line.startsWith("::set-output ")
        ? line.substring(12).trim()
        : line.substring(15).trim();
      const arr = str.split("=");
      if (arr.length === 2) {
        const key = arr[0].trim();
        const value = arr[1].trim();
        output[key] = value;
      }
    }
  }
  return output;
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
