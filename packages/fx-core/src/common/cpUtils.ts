// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider } from "@microsoft/teamsfx-api";
import * as cp from "child_process";
import * as os from "os";

export async function executeCommand(
  command: string,
  args: string[],
  logger?: LogProvider,
  options?: cp.SpawnOptions,
  workingDirectory?: string
): Promise<string> {
  const result: ICommandResult = await tryExecuteCommand(
    command,
    args,
    logger,
    options,
    workingDirectory
  );
  if (result.code !== 0) {
    const errorMessage = `Failed to execute ${command} with arguments: ${JSON.stringify(
      args
    )}. stdout: ${result.stdout}, stderr: ${result.stderr}, code: ${result.code}`;
    await logger?.debug(errorMessage);
    throw new Error(errorMessage);
  } else {
    await logger?.debug(`Finished execute ${command} with arguments: ${JSON.stringify(args)}.`);
  }

  return result.stdout;
}

export async function tryExecuteCommand(
  command: string,
  args: string[],
  logger?: LogProvider,
  additionalOptions?: cp.SpawnOptions,
  workingDirectory?: string
): Promise<ICommandResult> {
  return await new Promise(
    (resolve: (res: ICommandResult) => void, reject: (e: Error) => void): void => {
      let stdout = "";
      let stderr = "";

      const options: cp.SpawnOptions = {
        cwd: workingDirectory || os.tmpdir(),
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
            `Stop command execution due to timeout, command: ${command}, arguments: ${JSON.stringify(
              args
            )}, options: '${JSON.stringify(options)}'`
          );
          reject(
            new Error(
              `Execute ${command} with arguments ${JSON.stringify(args)} timeout, ${
                options.timeout
              } ms`
            )
          );
        }, options.timeout);
      }
      logger?.debug(
        `Executing ${command}, arguments = ${JSON.stringify(args)}, options = '${JSON.stringify(
          options
        )}'`
      );

      childProc.stdout?.on("data", (data: string | Buffer) => {
        stdout = stdout.concat(data.toString());
      });

      childProc.stderr?.on("data", (data: string | Buffer) => {
        stderr = stderr.concat(data.toString());
      });

      childProc.on("error", (error) => {
        logger?.debug(
          `Failed to execute ${command} with arguments: ${JSON.stringify(
            args
          )}. stderr: ${stderr}, error: ${error}`
        );
        if (timer) {
          clearTimeout(timer);
        }
        reject(error);
      });
      childProc.on("close", (code: number) => {
        logger?.debug("Command finished.");
        if (timer) {
          clearTimeout(timer);
        }
        resolve({
          code,
          stdout: stdout,
          stderr: stderr,
        });
      });
    }
  );
}

interface ICommandResult {
  code: number;
  stdout: string;
  stderr: string;
}
