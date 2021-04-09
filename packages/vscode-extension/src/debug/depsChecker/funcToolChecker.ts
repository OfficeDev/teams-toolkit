// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { cpUtils } from "../cpUtils";
import { IDepsChecker, DepsCheckerError, DepsInfo } from "./checker";
import { funcToolCheckerEnabled, hasTeamsfxBackend, logger, runWithProgressIndicator } from "./checkerAdapter";

enum FuncVersion {
  v1 = "1",
  v2 = "2",
  v3 = "3"
}

const funcPackageName = "azure-functions-core-tools";
const funcToolName = "Azure Function Core Tool";

// TODO: extract to messages.ts
const startInstallFunctionCoreTool =
  `Downloading and installing ${funcToolName} (v${FuncVersion.v3}).`;
const finishInstallFunctionCoreTool =
  `Successfully installed ${funcToolName} (v${FuncVersion.v3}).`;
const needReplaceWithFuncCoreToolV3 =
  `You must replace with ${funcToolName} (v${FuncVersion.v3}) to debug your local functions.`;
const needInstallFuncCoreTool =
  `You must have ${funcToolName} (v${FuncVersion.v3}) installed to debug your local functions.`;
const failToInstallFuncCoreTool =
  `${funcToolName} (v${FuncVersion.v3}) installation has failed and will have to be installed manually.`;
const helpLink = "https://review.docs.microsoft.com/en-us/mods/?branch=main";

export class FuncToolChecker implements IDepsChecker {
  getDepsInfo(): Promise<DepsInfo> {
    return Promise.resolve({
      nameWithVersion: `${funcToolName} (v${FuncVersion.v3})`,
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
        throw new DepsCheckerError(needReplaceWithFuncCoreToolV3, helpLink);
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
      throw new DepsCheckerError(needInstallFuncCoreTool, helpLink);
    }

    logger.info(startInstallFunctionCoreTool);
    await runWithProgressIndicator(logger.outputChannel, async () => {
      try {
        await installFuncCoreTools(FuncVersion.v3);
      } catch (error) {
        throw new DepsCheckerError(failToInstallFuncCoreTool, helpLink);
      }
    });

    const isInstalled = await this.isInstalled();
    if (!isInstalled) {
      throw new DepsCheckerError(failToInstallFuncCoreTool, helpLink);
    }

    logger.info(finishInstallFunctionCoreTool);
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
}

function getFuncToolsVersion(output: string): FuncVersion | null {
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
