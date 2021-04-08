// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { workspace, WorkspaceConfiguration } from "vscode";
import { cpUtils } from "../cpUtils";
import { IDepsChecker, DepsCheckerError } from "./checker";
import { checkerEnabled, logger, runWithProgressIndicator } from "./checkerAdapter";

const funcPackageName = "azure-functions-core-tools";
const configurationPrefix = "fx-extension";
const validateFuncCoreToolsKey = "validateFuncCoreTools";

// TODO: extract to messages.ts
const startInstallFunctionCoreTool =
  "Starting to install the Azure Functions Core Tools v3.";
const finishInstallFunctionCoreTool =
  "Successfully installed the Azure Functions Core Tools v3.";
const needReplaceWithFuncCoreToolV3 =
  "You must replace with the Azure Functions Core Tools v3 to debug your local functions.";
const needInstallFuncCoreTool =
  "You must have the Azure Functions Core Tools v3 installed to debug your local functions.";
const failToInstallFuncCoreTool =
  "The Azure Functions Core Tools v3 installation has failed and will have to be installed manually.";

export class FuncToolChecker implements IDepsChecker {
  getDepsInfo(): Promise<Map<string, string>> {
    return Promise.resolve(new Map<string, string>());
  }

  isEnabled(): Promise<boolean> {
    return Promise.resolve(checkerEnabled(validateFuncCoreToolsKey));
  }

  async isInstalled(): Promise<boolean> {
    const installed = true;
    const installedVersion = await getInstalledFuncToolsVersion();

    switch (installedVersion) {
      case FuncVersion.v1:
        throw new DepsCheckerError(needReplaceWithFuncCoreToolV3);
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
      throw new DepsCheckerError(needInstallFuncCoreTool);
    }

    logger.info(startInstallFunctionCoreTool);
    await runWithProgressIndicator(logger.outputChannel, async () => {
      try {
        await installFuncCoreTools(FuncVersion.v3)
      } catch (error) {
        throw new DepsCheckerError(failToInstallFuncCoreTool);
      }
    });

    const isInstalled = await this.isInstalled();
    if (!isInstalled) {
      throw new DepsCheckerError(failToInstallFuncCoreTool);
    }

    logger.info(finishInstallFunctionCoreTool);
  }
}

enum FuncVersion {
  v1 = "1",
  v2 = "2",
  v3 = "3"
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
