// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  defaultHelpLink,
  DepsCheckerError,
  DepsLogger,
  DepsType,
  installExtension,
  Messages,
} from "@microsoft/teamsfx-core/build/common/deps-checker";
import { VSCodeDepsChecker } from "./vscodeChecker";

export async function installBackendExtension(
  backendRoot: string,
  depsChecker: VSCodeDepsChecker,
  logger: DepsLogger
): Promise<boolean> {
  const dotnet = await depsChecker.getDepsStatus(DepsType.Dotnet);
  try {
    await installExtension(backendRoot, dotnet.command, logger);
  } catch (e) {
    if (e instanceof DepsCheckerError) {
      await depsChecker.display(e.message, e.helpLink);
    } else {
      await depsChecker.display(Messages.defaultErrorMessage()[0], defaultHelpLink);
    }
    return false;
  }
  return true;
}
