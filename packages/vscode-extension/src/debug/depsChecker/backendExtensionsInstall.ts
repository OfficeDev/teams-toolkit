// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, Result, Void, ok } from "@microsoft/teamsfx-api";
import {
  defaultHelpLink,
  DepsCheckerError,
  DepsLogger,
  DepsType,
  installExtension,
  Messages,
} from "@microsoft/teamsfx-core";
import { VSCodeDepsChecker } from "./vscodeChecker";

export async function installBackendExtension(
  backendRoot: string,
  depsChecker: VSCodeDepsChecker,
  logger: DepsLogger
): Promise<Result<Void, DepsCheckerError>> {
  const dotnet = await depsChecker.getDepsStatus(DepsType.Dotnet);
  try {
    await installExtension(backendRoot, dotnet.command, logger);
  } catch (e) {
    if (e instanceof DepsCheckerError) {
      await depsChecker.display(e.message, e.helpLink);
      return err(e);
    } else {
      await depsChecker.display(Messages.defaultErrorMessage, defaultHelpLink);
      return err(new DepsCheckerError(Messages.defaultErrorMessage, defaultHelpLink));
    }
  }
  return ok(Void);
}
