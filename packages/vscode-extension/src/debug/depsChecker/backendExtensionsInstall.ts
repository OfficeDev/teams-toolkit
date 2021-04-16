import { logger } from "./checkerAdapter";
import { backendExtensionsInstallHelpLink } from "./common";
import { cpUtils } from "../cpUtils";
import { dotnetChecker } from "./dotnetChecker";
import { BackendExtensionsInstallError } from "./errors";

export async function backendExtensionsInstall(backendRoot: string): Promise<void> {
  const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
  
  if (dotnetExecPath === "") {
    logger.error(`Failed to run backend extension install, .NET SDK executable not found`);
    throw new BackendExtensionsInstallError("Failed to run backend extension install, .NET SDK executable not found", backendExtensionsInstallHelpLink);
  }

  try {
    await cpUtils.executeCommand(
      backendRoot,
      logger,
      { shell: false },
      dotnetExecPath,
      "build",
      "-o",
      "bin"
      );
  } catch (error) {
    logger.error(`Failed to run backend extension install: error = '${error}'`);
    throw new BackendExtensionsInstallError(`Failed to run backend extension install: error = '${error}'`, backendExtensionsInstallHelpLink);
  }
}