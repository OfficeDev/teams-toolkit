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
import { EnvCheckerTelemetry, EnvCheckerEvent, TelemtryMessages } from "../envCheckerTelemetry";

export async function tryValidateFuncCoreToolsInstalled(): Promise<boolean> {
  try {
    const isValid: boolean = await validateFuncCoreToolsInstalled();
    if (!isValid) {
      await debug.stopDebugging();
      return false;
    }
  } catch (err) {
    await displayLearnMore(Messages.failToInstallFuncCoreTool, funcCoreToolsHelpLink);
    await debug.stopDebugging();
    EnvCheckerTelemetry.sendSystemErrorEvent(
      EnvCheckerEvent.installingFunc,
      TelemtryMessages.failedToInstallFunc,
      err
    );
    return false;
  }

  return true;
}

async function validateFuncCoreToolsInstalled(): Promise<boolean> {
  if (!needValidateFuncCoreTools()) {
    EnvCheckerTelemetry.sendEvent(EnvCheckerEvent.skipCheckFunc);
    return true;
  }

  let installed = false;

  // TODO: verify that Func Tools v2 is not supported by local debug
  const supportedVersion = FuncVersion.v3;
  const installedVersion = await getInstalledFuncToolsVersion();

  EnvCheckerTelemetry.sendEvent(EnvCheckerEvent.checkFunc);
  switch (installedVersion) {
    case FuncVersion.v1:
      await displayLearnMore(Messages.needReplaceWithFuncCoreToolV3, funcCoreToolsHelpLink);
      EnvCheckerTelemetry.sendEvent(EnvCheckerEvent.funcV1Installed);
      EnvCheckerTelemetry.sendUserErrorEvent(
        EnvCheckerEvent.checkFunc,
        TelemtryMessages.funcV1Installed
      );
      break;
    case FuncVersion.v2:
      EnvCheckerTelemetry.sendEvent(EnvCheckerEvent.funcV2Installed);
      installed = true;
      break;
    case FuncVersion.v3:
      EnvCheckerTelemetry.sendEvent(EnvCheckerEvent.funcV3Installed);
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
            EnvCheckerTelemetry.sendEvent(EnvCheckerEvent.installingFunc);
            EnvCheckerTelemetry.sendEventWithDuration(EnvCheckerEvent.installedFunc, async () => {
              await installFuncCoreTools(packageManagers, supportedVersion);
              installed = true;
            });
          }
        );
      } else {
        await displayLearnMore(Messages.needInstallFuncCoreToolV3, funcCoreToolsHelpLink);
        EnvCheckerTelemetry.sendUserErrorEvent(
          EnvCheckerEvent.installingFunc,
          TelemtryMessages.packageManagerNotFound
        );
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
