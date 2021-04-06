// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { cpUtils } from "../cpUtils";
import { funcPackageName, PackageManager } from "../constants";
import log from "../../commonlib/log";
import { FuncVersion } from "./funcVersion";

export async function installFuncCoreTools(
  packageManagers: PackageManager[],
  version: FuncVersion
): Promise<void> {
  log.outputChannel.show(false);
  // Use the first package manager
  switch (packageManagers[0]) {
    case PackageManager.npm:
      await cpUtils.executeCommand(
        undefined,
        log,
        undefined,
        "npm",
        "install",
        "-g",
        `${funcPackageName}@${version}`
      );
      break;
    case PackageManager.brew:
      // TODO: support brew for macOS
      break;
    default:
      throw new RangeError(`Invalid package manager "${packageManagers[0]}".`);
  }
}
