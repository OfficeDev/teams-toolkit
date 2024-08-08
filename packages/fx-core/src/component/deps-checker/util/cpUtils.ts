// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/* eslint-disable @typescript-eslint/no-namespace */
import * as cp from "child_process";
import * as os from "os";

export interface DebugLogger {
  debug(message: string): void;
}

export namespace cpUtils {
  export async function executeCommand(
    workingDirectory: string | undefined,
    logger: DebugLogger | undefined,
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
      const errorMessage = `Failed to run command: "${command} ${result.formattedArgs}", code: "${result.code}",
                            output: "${result.cmdOutput}", error: "${result.cmdOutputIncludingStderr}"`;
      logger?.debug(errorMessage);
      throw new Error(errorMessage);
    } else {
      logger?.debug(`Finished running command: "${command} ${result.formattedArgs}".`);
    }

    return result.cmdOutput;
  }

  export async function tryExecuteCommand(
    workingDirectory: string | undefined,
    logger: DebugLogger | undefined,
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
          shell: true,
        };
        Object.assign(options, additionalOptions);

        const childProc: cp.ChildProcess = cp.spawn(command, args, options);
        let timer: NodeJS.Timeout;
        if (options.timeout && options.timeout > 0) {
          // timeout only exists for exec not spawn
          timer = setTimeout(() => {
            childProc.kill();
            logger?.debug(
              `Stop exec due to timeout, command: "${command} ${formattedArgs}", options = '${JSON.stringify(
                options
              )}'`
            );
            reject(
              new Error(
                `Exec command: "${command} ${formattedArgs}" timeout, ${options.timeout || 0} ms`
              )
            );
          }, options.timeout);
        }
        logger?.debug(
          `Running command: "${command} ${formattedArgs}", options = '${JSON.stringify(options)}'`
        );

        childProc.stdout?.on("data", (data: string | Buffer) => {
          data = data.toString();
          cmdOutput = cmdOutput.concat(data);
          cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
        });

        childProc.stderr?.on("data", (data: string | Buffer) => {
          data = data.toString();
          cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
        });

        childProc.on("error", (error) => {
          logger?.debug(
            `Failed to run command '${command} ${formattedArgs}': cmdOutputIncludingStderr: '${cmdOutputIncludingStderr}', error: ${error.toString()}`
          );
          if (timer) {
            clearTimeout(timer);
          }
          reject(error);
        });
        childProc.on("close", (code: number) => {
          logger?.debug(
            `Command finished with outputs, cmdOutputIncludingStderr: '${cmdOutputIncludingStderr}'`
          );
          if (timer) {
            clearTimeout(timer);
          }
          resolve({
            code,
            cmdOutput,
            cmdOutputIncludingStderr,
            formattedArgs,
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

  const quotationMark: string = process.platform === "win32" ? '"' : "'";

  /**
   * Ensures spaces and special characters (most notably $) are preserved
   */
  export function wrapArgInQuotes(arg: string): string {
    return quotationMark + arg + quotationMark;
  }

  /**
   * timeout with millisecond
   */
  export function withTimeout(millis: number, promise: Promise<any>, msg: string): Promise<any> {
    return Promise.race([
      promise,
      new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error(`${msg}, ${millis} ms`)), millis)
      ),
    ]);
  }
}
