/**
 * @author huajiezhang <huajiezhang@microsoft.com>
 */
import { assembleError, err, FxError, ok, Result } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { exec, ExecException } from "child_process";
import * as path from "path";
import fs from "fs-extra";
import { DotenvOutput } from "../../utils/envUtil";
import { hooks } from "@feathersjs/hooks";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../constant/commonConstant";

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
  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.SCRIPT_COMPONENT)])
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const typedArgs = args as ScriptDriverArgs;
    const res = await this.executeCommand(typedArgs, context);
    if (res.isErr()) return err(res.error);
    const outputs = res.value[1];
    const kvArray: [string, string][] = Object.keys(outputs).map((k) => [k, outputs[k]]);
    return ok(new Map(kvArray));
  }

  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.SCRIPT_COMPONENT)])
  async execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    const res = await this.run(args, ctx);
    const summary = `${
      res.isOk() ? "success" : "failed"
    } to execute command '${this.maskSecretValues((args as any).run)}'`;
    return { result: res, summaries: [summary] };
  }
  async execCallback(
    resolve: any,
    error: ExecException | null,
    stdout: string,
    stderr: string,
    command: string,
    context: DriverContext,
    workingDir: string,
    appendFile?: string
  ) {
    if (stdout) {
      await context.logProvider.info(this.maskSecretValues(stdout));
      if (appendFile) {
        await fs.appendFile(appendFile, stdout);
      }
    }
    if (stderr) {
      await context.logProvider.error(this.maskSecretValues(stderr));
      if (appendFile) {
        await fs.appendFile(appendFile, stderr);
      }
    }
    if (error) {
      await context.logProvider.error(
        `Failed to run command: "${this.maskSecretValues(command)}" on path: "${workingDir}".`
      );
      resolve(err(assembleError(error)));
    } else {
      resolve(ok([stdout, {}]));
    }
  }
  async executeCommand(
    args: ScriptDriverArgs,
    context: DriverContext
  ): Promise<Result<[string, DotenvOutput], FxError>> {
    return new Promise(async (resolve, reject) => {
      let workingDir = args.workingDirectory || ".";
      workingDir = path.isAbsolute(workingDir)
        ? workingDir
        : path.join(context.projectPath, workingDir);
      let command = args.run;
      let shell = args.shell;
      const defaultShellMap: any = {
        win32: "powershell",
        darwin: "bash",
        linux: "bash",
      };
      shell = shell || defaultShellMap[process.platform];
      let appendFile: string | undefined = undefined;
      if (args.redirectTo) {
        appendFile = path.isAbsolute(args.redirectTo)
          ? args.redirectTo
          : path.join(context.projectPath, args.redirectTo);
      }
      const outputs = this.parseKeyValueInOutput(command);
      if (outputs) {
        resolve(ok(["", outputs]));
        return;
      }
      if (shell === "cmd") {
        command = `%ComSpec% /D /E:ON /V:OFF /S /C "CALL ${args.run}"`;
      }
      context.logProvider.info(`Start to run command: "${command}" on path: "${workingDir}".`);
      if (context.ui?.runCommand) {
        const uiRes = await context.ui.runCommand({
          cmd: command,
          workingDirectory: workingDir,
          shell: shell,
          timeout: args.timeout,
        });
        if (uiRes.isErr()) resolve(err(uiRes.error));
        resolve(ok(["", {}]));
        return;
      } else {
        exec(
          command,
          {
            shell: shell,
            cwd: workingDir,
            encoding: "utf8",
            env: { ...process.env },
            timeout: args.timeout,
          },
          async (error, stdout, stderr) => {
            await this.execCallback(
              resolve,
              error,
              stdout,
              stderr,
              command,
              context,
              workingDir,
              appendFile
            );
          }
        );
      }
    });
  }
  parseKeyValueInOutput(command: string): DotenvOutput | undefined {
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
  maskSecretValues(stdout: string): string {
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
}

export const scriptDriver = new ScriptDriver();
