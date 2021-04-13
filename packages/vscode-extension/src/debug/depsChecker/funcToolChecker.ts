// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import { cpUtils } from "../cpUtils";
import { IDepsChecker, DepsCheckerError, DepsInfo } from "./checker";
import { funcToolCheckerEnabled, hasTeamsfxBackend, logger, runWithProgressIndicator } from "./checkerAdapter";
import { isWindows, Messages, functionCoreToolsHelpLink } from "./common";

export enum FuncVersion {
  v1 = "1",
  v2 = "2",
  v3 = "3"
}

const funcPackageName = "azure-functions-core-tools";
const funcToolName = "Azure Function Core Tool";
export const installedNameWithVersion = `${funcToolName} (v${FuncVersion.v3})`;

export class FuncToolChecker implements IDepsChecker {
  getDepsInfo(): Promise<DepsInfo> {
    return Promise.resolve({
      nameWithVersion: installedNameWithVersion,
      details: new Map<string, string>()
    });
  }

  async isEnabled(): Promise<boolean> {
    const hasBackend = await hasTeamsfxBackend();
    return hasBackend && funcToolCheckerEnabled();
  }

  async isInstalled(): Promise<boolean> {
    const installed = true;
    const installedVersion = await getInstalledFuncToolsVersion();

    switch (installedVersion) {
      case FuncVersion.v1:
        throw new DepsCheckerError(Messages.needReplaceWithFuncCoreToolV3.replace("@NameVersion", installedNameWithVersion), functionCoreToolsHelpLink);
      case FuncVersion.v2:
        return installed;
      case FuncVersion.v3:
        return installed;
      default:
        return !installed;
    }
  }

  async install(): Promise<void> {
    if (!(await hasNPM())) {
      // provided with Learn More link if npm doesn't exist.
      throw new DepsCheckerError(Messages.needInstallFuncCoreTool.replace("@NameVersion", installedNameWithVersion), functionCoreToolsHelpLink);
    }

    logger.info(Messages.startInstallFunctionCoreTool.replace("@NameVersion", installedNameWithVersion));
    await runWithProgressIndicator(async () => {
      try {
        await installFuncCoreTools(FuncVersion.v3);
      } catch (error) {
        throw new DepsCheckerError(Messages.failToInstallFuncCoreTool.replace("@NameVersion", installedNameWithVersion), functionCoreToolsHelpLink);
      }
    });

    const isInstalled = await this.isInstalled();
    if (!isInstalled) {
      throw new DepsCheckerError(Messages.failToInstallFuncCoreTool.replace("@NameVersion", installedNameWithVersion), functionCoreToolsHelpLink);
    }

    logger.info(Messages.finishInstallFunctionCoreTool.replace("@NameVersion", installedNameWithVersion));
  }
}

async function getInstalledFuncToolsVersion(): Promise<FuncVersion | null> {
  try {
    const output = await cpUtils.executeCommand(
      undefined,
      undefined,
      undefined,
      "func",
      "--version"
    );
    return getFuncToolsVersion(output);
  } catch (error) {
    return null;
  }
}

async function hasNPM(): Promise<boolean> {
  try {
    await cpUtils.executeCommand(undefined, undefined, undefined, "npm", "--version");
    return true;
  } catch (error) {
    // an error indicates no npm
    return false;
  }
}

async function installFuncCoreTools(version: FuncVersion): Promise<void> {
  // TODO: handle the case that npm install globally need admin permission on macOS.
  await cpUtils.executeCommand(
    undefined,
    logger,
    undefined,
    "npm",
    "install",
    "-g",
    `${funcPackageName}@${version}`
  );

  // delete func.ps1 if exists to workaround the powershell execution policy issue:
  // https://github.com/npm/cli/issues/470
  if (isWindows()) {
    const funcPSScript = await getFuncPSScriptPath();
    if (await fs.pathExists(funcPSScript)) {
      await fs.remove(funcPSScript);
    }
  }
}

async function getFuncPSScriptPath(): Promise<string> {
  try {
    const output = await cpUtils.executeCommand(
      undefined,
      logger,
      {
        shell: "cmd.exe"
      },
      "where",
      "func",
    );

    const funcPath = output.split(/\r?\n/)[0];
    const funcFolder = path.dirname(funcPath);

    return path.join(funcFolder, "func.ps1");
  } catch {
    // ignore error and regard func.ps1 as not found.
    return "";
  }
}

export function getFuncToolsVersion(output: string): FuncVersion | null {
  const regex = /(?<major_version>\d+)\.(?<minor_version>\d+)\.(?<patch_version>\d+)/gm;
  const match = regex.exec(output);
  if (!match) {
    return null;
  }

  switch (match.groups?.major_version) {
    case FuncVersion.v1:
      return FuncVersion.v1;
    case FuncVersion.v2:
      return FuncVersion.v2;
    case FuncVersion.v3:
      return FuncVersion.v3;
    default:
      return null;
  }
}
