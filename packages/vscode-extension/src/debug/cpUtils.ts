/* eslint-disable @typescript-eslint/no-namespace */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as cp from "child_process";
import * as os from "os";
import * as util from "util";
import { VsCodeLogProvider } from "../commonlib/log";

export namespace cpUtils {
  export async function executeCommand(
    workingDirectory: string | undefined,
    logger: VsCodeLogProvider | undefined,
    options: cp.SpawnOptions | undefined,
    command: string,
    ...args: string[]
  ): Promise<string> {
    const result: ICommandResult = await tryExecuteCommand(
      workingDirectory,
      logger,
      options,
      command,
      ...args
    );
    if (result.code !== 0) {
      throw new Error(`Failed to run "${command}" command. Check output window for more details.`);
    } else {
      // await logger?.debug(`Finished running command: "${command} ${result.formattedArgs}".`);
    }

    return result.cmdOutput;
  }

  export async function tryExecuteCommand(
    workingDirectory: string | undefined,
    logger: VsCodeLogProvider | undefined,
    additionalOptions: cp.SpawnOptions | undefined,
    command: string,
    ...args: string[]
  ): Promise<ICommandResult> {
    return await new Promise(
      (resolve: (res: ICommandResult) => void, reject: (e: Error) => void): void => {
        let cmdOutput = "";
        let cmdOutputIncludingStderr = "";
        const formattedArgs: string = args.join(" ");

        workingDirectory = workingDirectory || os.tmpdir();
        const options: cp.SpawnOptions = {
          cwd: workingDirectory,
          shell: true
        };
        Object.assign(options, additionalOptions);

        const childProc: cp.ChildProcess = cp.spawn(command, args, options);
        // logger?.debug(`Running command: "${command} ${formattedArgs}"...`);

        childProc.stdout?.on("data", (data: string | Buffer) => {
          data = data.toString();
          cmdOutput = cmdOutput.concat(data);
          cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
        });

        childProc.stderr?.on("data", (data: string | Buffer) => {
          data = data.toString();
          cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
        });

        childProc.on("error", reject);
        childProc.on("close", (code: number) => {
          // logger?.debug(cmdOutputIncludingStderr);
          resolve({
            code,
            cmdOutput,
            cmdOutputIncludingStderr,
            formattedArgs
          });
        });
      }
    );
  }

  export interface ICommandResult {
    code: number;
    cmdOutput: string;
    cmdOutputIncludingStderr: string;
    formattedArgs: string;
  }

  const quotationMark: string = process.platform === "win32" ? "\"" : "'";
  /**
   * Ensures spaces and special characters (most notably $) are preserved
   */
  export function wrapArgInQuotes(arg: string): string {
    return quotationMark + arg + quotationMark;
  }
}
