/**
 * @author huajiezhang <huajiezhang@microsoft.com>
 */
import { err, FxError, ok, Result } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { exec } from "child_process";
import * as path from "path";
import fs from "fs-extra";
import { DotenvOutput } from "../../utils/envUtil";
import { ObjectIsUndefinedError } from "../../../core/error";

const ACTION_NAME = "script";

interface ScriptDriverArgs {
  run: string;
  workingDirectory?: string;
  shell?: string;
  timeout?: number;
  redirectTo?: string;
}

@Service(ACTION_NAME)
export class ScriptStepDriver implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const typedArgs = args as ScriptDriverArgs;
    const res = await execute(typedArgs, context);
    if (res.isErr()) return err(res.error);
    const outputs = res.value[1];
    const kvArray: [string, string][] = Object.keys(outputs).map((k) => [k, outputs[k]]);
    return ok(new Map(kvArray));
  }
  async execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    const res = await this.run(args, ctx);
    return { result: res, summaries: ["run script"] };
  }
}

export function execute(
  args: ScriptDriverArgs,
  context: DriverContext
): Promise<Result<[string, DotenvOutput], FxError>> {
  return new Promise((resolve, reject) => {
    let workingDir = args.workingDirectory || ".";
    workingDir = path.isAbsolute(workingDir)
      ? workingDir
      : path.join(context.projectPath, workingDir);
    let command = args.run;
    let shell = args.shell;
    if (process.platform === "win32") {
      shell = shell || "powershell";
    } else if (process.platform === "darwin" || process.platform === "linux") {
      shell = shell || "bash";
    }
    if (shell === "cmd") {
      command = `%ComSpec% /D /E:ON /V:OFF /S /C "CALL ${args.run}"`;
    }
    context.logProvider.info(`Start to run command: "${command}" on path: "${workingDir}".`);
    let appendFile: string | undefined = undefined;
    if (args.redirectTo) {
      appendFile = path.isAbsolute(args.redirectTo)
        ? args.redirectTo
        : path.join(context.projectPath, args.redirectTo);
    }
    const outputs = parseKeyValueInOutput(command);
    if (outputs) {
      resolve(ok(["", outputs]));
      return;
    }
    exec(
      command,
      { shell: shell, cwd: workingDir, env: { ...process.env }, timeout: args.timeout },
      async (error, stdout, stderr) => {
        if (error) {
          await context.logProvider.error(
            `Failed to run command: "${command}" on path: "${workingDir}".`
          );
          reject(err(error));
        }
        if (stdout) {
          await context.logProvider.info(maskSecretValues(stdout));
          if (appendFile) {
            await fs.appendFile(appendFile, stdout);
          }
        }
        if (stderr) {
          await context.logProvider.error(maskSecretValues(stderr));
          if (appendFile) {
            await fs.appendFile(appendFile, stderr);
          }
        }
        resolve(ok([stdout, {}]));
      }
    );
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
  // let arr = command.split(">>");
  // if (arr.length === 2 && arr[0].startsWith("echo")) {
  //   const valueStr = arr[1].trim();
  //   if (valueStr.startsWith("{{") && valueStr.endsWith("}}")) {
  //     const key = arr[1].substring(2, valueStr.length - 2);
  //     const value = arr[0].trim();
  //     const output: DotenvOutput = { [key] : value };
  //     return output;
  //   }
  // }
  return undefined;
}

function maskSecretValues(stdout: string): string {
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
