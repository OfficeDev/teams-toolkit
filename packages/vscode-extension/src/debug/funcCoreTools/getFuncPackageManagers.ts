// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PackageManager } from "../constants";
import { cpUtils } from "../cpUtils";

export async function getFuncPackageManagers(): Promise<PackageManager[]> {
  const result: PackageManager[] = [];
  switch (process.platform) {
    case "linux":
      // known issues: https://github.com/Microsoft/vscode-azurefunctions/issues/311
      // only provided help link for linux user.
      break;
    case "darwin":
    // TODO: support to install function core tool with brew
    // fall through to check npm on both mac and windows
    default:
      try {
        await cpUtils.executeCommand(undefined, undefined, undefined, "npm", "--version");
        result.push(PackageManager.npm);
      } catch (error) {
        // an error indicates no npm
      }
  }

  return result;
}
