// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { cpUtils } from "../../../../src/common/deps-checker/util/cpUtils";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as os from "os";
import * as fs from "fs-extra";

export const portableFuncInstallPath = path.join(
  os.homedir(),
  `.${ConfigFolderName}`,
  "bin",
  "func"
);
export const portableFuncSentinelPath = path.join(
  os.homedir(),
  `.${ConfigFolderName}`,
  "func-sentinel"
);

export async function cleanup(): Promise<void> {
  await fs.remove(portableFuncInstallPath);
  await fs.remove(portableFuncSentinelPath);
}

export async function isFuncCoreToolsInstalled(): Promise<boolean> {
  const funcVersion = String(await getFuncCoreToolsVersion());
  return supportedFuncVersions.includes(funcVersion);
}

const supportedFuncVersions = ["3"];

export async function getFuncCoreToolsVersion(): Promise<string | null> {
  try {
    const output = await cpUtils.executeCommand(
      undefined,
      undefined,
      undefined,
      "func",
      "--version"
    );
    const regex = /(?<major_version>\d+)\.(?<minor_version>\d+)\.(?<patch_version>\d+)/gm;
    const match = regex.exec(output);
    if (!match) {
      return null;
    }

    switch (match.groups?.major_version) {
      case "1":
        return "1";
      case "2":
        return "2";
      case "3":
        return "3";
      default:
        return null;
    }
  } catch (error) {
    console.debug(`Failed to run 'func --version', error = '${error}'`);
    return null;
  }
}
