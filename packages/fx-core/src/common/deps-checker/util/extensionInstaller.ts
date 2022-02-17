// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DepsLogger } from "../depsLogger";
import { BackendExtensionsInstallError } from "../depsError";
import { defaultHelpLink, dotnetNotSupportTargetVersionHelpLink } from "../constant";
import { cpUtils } from "./cpUtils";

const defaultOutputPath = "bin";
const defaultCsprojPath = "extensions.csproj";

export async function installExtension(
  backendRoot: string,
  dotnetCommand: string,
  logger: DepsLogger,
  csprojPath: string = defaultCsprojPath,
  outputPath: string = defaultOutputPath
): Promise<void> {
  try {
    if (!outputPath) {
      outputPath = defaultOutputPath;
    }
    await checkCommand(dotnetCommand, logger);

    const result: cpUtils.ICommandResult = await cpUtils.tryExecuteCommand(
      backendRoot,
      logger,
      { shell: false },
      dotnetCommand,
      "build",
      csprojPath,
      "-o",
      outputPath,
      "--ignore-failed-sources"
    );

    if (result.code !== 0) {
      throw new Error(
        `Failed to run "${dotnetCommand} build" command. output = ${result.cmdOutput}, err = ${result.cmdOutputIncludingStderr}`
      );
    }
  } catch (error) {
    await logger.printDetailLog();
    await logger.error(
      `Failed to run Azure Functions binding extension install: error = '${error}'`
    );

    if (error.message.includes("NETSDK1045")) {
      // refer to https://docs.microsoft.com/en-us/dotnet/core/tools/sdk-errors/netsdk1045
      throw new BackendExtensionsInstallError(
        `NETSDK1045: The current .NET SDK does not support 'newer version' as a target`,
        dotnetNotSupportTargetVersionHelpLink
      );
    }

    if (error instanceof BackendExtensionsInstallError) {
      throw error;
    } else {
      throw new BackendExtensionsInstallError(
        `Failed to run Azure Functions binding extension install: error = '${error}'`,
        defaultHelpLink
      );
    }
  } finally {
    logger.cleanup();
  }
}

async function checkCommand(command: string, logger: DepsLogger) {
  if (command === "") {
    await logger.error(
      `Failed to run Azure Functions binding extension install, .NET SDK executable not found`
    );
    throw new BackendExtensionsInstallError(
      "Failed to run Azure Functions binding extension install, .NET SDK executable not found",
      defaultHelpLink
    );
  }
}
