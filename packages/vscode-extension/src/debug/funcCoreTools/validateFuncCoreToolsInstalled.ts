// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { debug, workspace, WorkspaceConfiguration } from "vscode";
import {
  funcCliPath,
  Messages,
  PackageManager,
  configurationPrefix,
  validateFuncCoreToolsKey,
  funcCoreToolsHelpLink
} from "../constants";
import { cpUtils } from "../cpUtils";
import { getFuncPackageManagers } from "./getFuncPackageManagers";
import { installFuncCoreTools } from "./installFuncCoreTools";
import { displayLearnMore, displayWarningMessage } from "../commonUtils";
import { FuncVersion, getFuncToolsVersion } from "./funcVersion";

export async function tryValidateFuncCoreToolsInstalled(): Promise<boolean> {
  try {
    const isValid: boolean = await validateFuncCoreToolsInstalled();
    if (!isValid) {
      await debug.stopDebugging();
      return false;
    }
  } catch (err) {
    // TODO: add log and telemetry
    await displayLearnMore(Messages.failToInstallFuncCoreTool, funcCoreToolsHelpLink);
    await debug.stopDebugging();
    return false;
  }

  return true;
}

async function validateFuncCoreToolsInstalled(): Promise<boolean> {
  if (!needValidateFuncCoreTools()) {
    return true;
  }

  let installed = false;

  // TODO: verify that Func Tools v2 is not supported by local debug
  const supportedVersion = FuncVersion.v3;
  const installedVersion = await getInstalledFuncToolsVersion();

  switch (installedVersion) {
    case FuncVersion.v1:
      await displayLearnMore(Messages.needReplaceWithFuncCoreToolV3, funcCoreToolsHelpLink);
      break;
    case FuncVersion.v2:
      installed = true;
      break;
    case FuncVersion.v3:
      installed = true;
      break;
    default:
      const packageManagers: PackageManager[] = await getFuncPackageManagers();
      if (packageManagers.length > 0) {
        // install for user if supported package managers exist.
        await displayWarningMessage(
          Messages.needInstallFuncCoreToolV3,
          Messages.installButtonText,
          async () => {
            await installFuncCoreTools(packageManagers, supportedVersion);
            installed = true;
          }
        );
      } else {
        await displayLearnMore(Messages.needInstallFuncCoreToolV3, funcCoreToolsHelpLink);
      }
  }

  return installed;
}

async function getInstalledFuncToolsVersion(): Promise<FuncVersion | null> {
  try {
    const output = await cpUtils.executeCommand(
      undefined,
      undefined,
      undefined,
      funcCliPath,
      "--version"
    );
    return getFuncToolsVersion(output);
  } catch (error) {
    return null;
  }
}

function needValidateFuncCoreTools(): boolean {
  const configuration: WorkspaceConfiguration = workspace.getConfiguration(configurationPrefix);
  return configuration.get<boolean>(validateFuncCoreToolsKey, true);
}
