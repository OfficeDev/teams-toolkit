/**
 * @author huajiezhang <huajiezhang@microsoft.com>
 */
import { err, FxError, Result, UserError } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { exec } from "child_process";
import * as path from "path";
import fs from "fs-extra";

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
    return err(new UserError({}));
  }
  async execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    return { result: err(new UserError({})), summaries: [] };
  }
}

export function execute(args: ScriptDriverArgs, context: DriverContext): Promise<string> {
  return new Promise((resolve, reject) => {
    let workingDir = path.resolve(args.workingDirectory || ".");
    workingDir = path.isAbsolute(workingDir)
      ? workingDir
      : path.join(context.projectPath, workingDir);
    let command = args.run;
    let shell = args.shell;
    if (process.platform === "win32") {
      command = `%ComSpec% /D /E:ON /V:OFF /S /C "CALL ${args.run}"`;
      shell = shell || "powershell";
    } else if (process.platform === "darwin" || process.platform === "linux") {
      shell = shell || "bash";
    }
    context.logProvider.info(`Start to run command: "${command}" on path: "${workingDir}".`);
    let appendFile: string | undefined = undefined;
    if (args.redirectTo) {
      appendFile = path.isAbsolute(args.redirectTo)
        ? args.redirectTo
        : path.join(context.projectPath, args.redirectTo);
    }
    exec(
      command,
      { shell: shell, cwd: workingDir, env: { ...process.env }, timeout: args.timeout },
      async (error, stdout, stderr) => {
        if (error) {
          await context.logProvider.error(
            `Failed to run command: "${command}" on path: "${workingDir}".`
          );
          reject(error);
        }
        if (stdout) {
          await context.logProvider.debug(stdout);
          if (appendFile) {
            await fs.appendFile(appendFile, stdout);
          }
        }
        if (stderr) {
          await context.logProvider.error(stderr);
          if (appendFile) {
            await fs.appendFile(appendFile, stderr);
          }
        }
        resolve(stdout);
      }
    );
  });
}
