// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author huajiezhang <huajiezhang@microsoft.com>
 */
import { err, FxError, ok, Result, LogProvider } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { hooks } from "@feathersjs/hooks";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../constant/commonConstant";
import { ProgressMessages } from "../../messages";
import { DotenvOutput } from "../../utils/envUtil";
import { ScriptExecutionError, ScriptTimeoutError } from "../../../error/script";
import { getSystemEncoding } from "../../utils/charsetUtils";
import * as path from "path";
import os from "os";
import fs from "fs-extra";
import iconv from "iconv-lite";
import child_process from "child_process";

const ACTION_NAME = "script";

interface ScriptDriverArgs {
  run: string;
  workingDirectory?: string;
  shell?: string;
  timeout?: number;
  redirectTo?: string;
}

@Service(ACTION_NAME)
export class ScriptDriver implements StepDriver {
  async _run(
    typedArgs: ScriptDriverArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    await context.progressBar?.next(
      ProgressMessages.runCommand(typedArgs.run, typedArgs.workingDirectory ?? "./")
    );
    const res = await executeCommand(
      typedArgs.run,
      context.projectPath,
      context.logProvider,
      context.ui,
      typedArgs.workingDirectory,
      undefined,
      typedArgs.shell,
      typedArgs.timeout,
      typedArgs.redirectTo
    );
    if (res.isErr()) return err(res.error);
    const outputs = res.value[1];
    const kvArray: [string, string][] = Object.keys(outputs).map((k) => [k, outputs[k]]);
    return ok(new Map(kvArray));
  }

  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.SCRIPT_COMPONENT)])
  async execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    const typedArgs = args as ScriptDriverArgs;
    const res = await this._run(typedArgs, ctx);
    const summaries: string[] = res.isOk()
      ? [`Successfully executed command ${maskSecretValues((args as any).run)}`]
      : [];
    return { result: res, summaries: summaries };
  }
}

export const scriptDriver = new ScriptDriver();

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
  const systemEncoding = await getSystemEncoding();
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let workingDir = workingDirectory || ".";
    workingDir = path.isAbsolute(workingDir) ? workingDir : path.join(projectPath, workingDir);
    if (platform === "win32") {
      workingDir = capitalizeFirstLetter(path.resolve(workingDir ?? ""));
    }
    let run = command;
    let appendFile: string | undefined = undefined;
    if (redirectTo) {
      appendFile = path.isAbsolute(redirectTo) ? redirectTo : path.join(projectPath, redirectTo);
    }
    if (shell === "cmd") {
      run = `%ComSpec% /D /E:ON /V:OFF /S /C "CALL ${command}"`;
    }
    logProvider.verbose(
      `Start to run command: "${command}" with args: ${JSON.stringify({
        shell: shell,
        cwd: workingDir,
        encoding: "buffer",
        env: { ...process.env, ...env },
        timeout: timeout,
      })}.`
    );
    const allOutputStrings: string[] = [];
    const stderrStrings: string[] = [];
    process.env.VSLANG = undefined; // Workaroud to disable VS environment variable to void charset encoding issue for non-English characters
    const cp = child_process.exec(
      run,
      {
        shell: shell,
        cwd: workingDir,
        encoding: "buffer",
        env: { ...process.env, ...env },
        timeout: timeout,
      },
      (error) => {
        if (error) {
          error.message = stderrStrings.join("").trim() || error.message;
          resolve(err(convertScriptErrorToFxError(error, run)));
        } else {
          // handle '::set-output' or '::set-teamsfx-env' pattern
          const outputString = allOutputStrings.join("");
          const outputObject = parseSetOutputCommand(outputString);
          if (Object.keys(outputObject).length > 0)
            logProvider.verbose(`script output env variables: ${JSON.stringify(outputObject)}`);
          resolve(ok([outputString, outputObject]));
        }
      }
    );
    const dataHandler = async (data: string) => {
      if (appendFile) {
        await fs.appendFile(appendFile, data);
      }
      allOutputStrings.push(data);
    };
    cp.stdout?.on("data", async (data: Buffer) => {
      const str = bufferToString(data, systemEncoding);
      logProvider.info(` [script action stdout] ${maskSecretValues(str)}`);
      await dataHandler(str);
    });
    const handler = getStderrHandler(logProvider, systemEncoding, stderrStrings, dataHandler);
    cp.stderr?.on("data", handler);
  });
}

export function getStderrHandler(
  logProvider: LogProvider,
  systemEncoding: string,
  stderrStrings: string[],
  dataHandler: (data: string) => Promise<void>
): (data: Buffer) => Promise<void> {
  return async (data: Buffer) => {
    const str = bufferToString(data, systemEncoding);
    logProvider.warning(` [script action stderr] ${maskSecretValues(str)}`);
    await dataHandler(str);
    stderrStrings.push(str);
  };
}

export function bufferToString(data: Buffer, systemEncoding: string): string {
  const str =
    systemEncoding === "utf8" || systemEncoding === "utf-8"
      ? data.toString()
      : iconv.decode(data, systemEncoding);
  return str;
}

export function convertScriptErrorToFxError(
  error: child_process.ExecException,
  run: string
): ScriptTimeoutError | ScriptExecutionError {
  if (error.killed) {
    return new ScriptTimeoutError(run);
  } else {
    return new ScriptExecutionError(run, error.message);
  }
}

export function parseSetOutputCommand(stdout: string): DotenvOutput {
  const regex = /(::set-teamsfx-env|::set-output)\s+([^"'\s]+)=([^"'\s]+)/g;
  const output: DotenvOutput = {};
  let match;
  while ((match = regex.exec(stdout))) {
    if (match && match.length === 4) {
      const key = match[2].trim();
      const value = match[3].trim();
      output[key] = value;
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

export function capitalizeFirstLetter(raw: string): string {
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
