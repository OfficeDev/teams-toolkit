// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import { cpUtils } from "../cpUtils";
import { IDepsChecker, DepsInfo } from "./checker";
import {
  funcToolCheckerEnabled,
  hasTeamsfxBackend,
  logger,
  runWithProgressIndicator
} from "./checkerAdapter";
import { DepsCheckerTelemetry, DepsCheckerEvent, TelemtryMessages } from "./telemetry";
import { isWindows, isMacOS, Messages, functionCoreToolsHelpLink } from "./common";
import { DepsCheckerError } from "./errors";

export enum FuncVersion {
  v1 = "1",
  v2 = "2",
  v3 = "3"
}

const funcPackageName = "azure-functions-core-tools";
const funcToolName = "Azure Function Core Tool";

const installVersion = FuncVersion.v3;
const supportedVersions = [FuncVersion.v2, FuncVersion.v3];
const installedNameWithVersion = `${funcToolName} (v${FuncVersion.v3})`;

export class FuncToolChecker implements IDepsChecker {
  public getDepsInfo(): Promise<DepsInfo> {
    return Promise.resolve({
      name: funcToolName,
      installVersion: installVersion,
      supportedVersions: supportedVersions,
      details: new Map<string, string>()
    });
  }

  public async isEnabled(): Promise<boolean> {
    const hasBackend = await hasTeamsfxBackend();
    const checkerEnabled = funcToolCheckerEnabled();
    if (!checkerEnabled) {
      // TODO: should send this event per user.
      // DepsCheckerTelemetry.sendEvent(DepsCheckerEvent.skipCheckFunc);
    }

    return hasBackend && checkerEnabled;
  }

  public async isInstalled(): Promise<boolean> {
    const installed = true;
    const installedVersion = await getInstalledFuncToolsVersion();

    DepsCheckerTelemetry.sendEvent(DepsCheckerEvent.funcCheck);
    switch (installedVersion) {
      case FuncVersion.v1:
        // TODO: should send this event per user.
        // DepsCheckerTelemetry.sendEvent(DepsCheckerEvent.funcV1Installed);
        // DepsCheckerTelemetry.sendUserErrorEvent(
        //   DepsCheckerEvent.checkFunc,
        //   TelemtryMessages.funcV1Installed
        // );
        throw new DepsCheckerError(
          Messages.needReplaceWithFuncCoreToolV3.replace("@NameVersion", installedNameWithVersion),
          functionCoreToolsHelpLink
        );
      case FuncVersion.v2:
        // TODO: should send this event per user.
        // DepsCheckerTelemetry.sendEvent(DepsCheckerEvent.funcV2Installed);
        return installed;
      case FuncVersion.v3:
        // TODO: should send this event per user.
        // DepsCheckerTelemetry.sendEvent(DepsCheckerEvent.funcV3Installed);
        return installed;
      default:
        return !installed;
    }
  }

  public async install(): Promise<void> {
    if (!(await hasNPM())) {
      // provided with Learn More link if npm doesn't exist.
      DepsCheckerTelemetry.sendUserErrorEvent(
        DepsCheckerEvent.funcInstall,
        TelemtryMessages.NPMNotFound
      );
      throw new DepsCheckerError(
        Messages.needInstallFuncCoreTool.replace("@NameVersion", installedNameWithVersion),
        functionCoreToolsHelpLink
      );
    }

    logger.info(
      Messages.startInstallFunctionCoreTool.replace("@NameVersion", installedNameWithVersion)
    );

    try {
      await DepsCheckerTelemetry.sendEventWithDuration(DepsCheckerEvent.funcInstallCompleted, async () => {
        await runWithProgressIndicator(async () => {
          await installFuncCoreTools(FuncVersion.v3);
        });
      });
    } catch (error) {
      DepsCheckerTelemetry.sendSystemErrorEvent(
        DepsCheckerEvent.funcInstall,
        TelemtryMessages.failedToInstallFunc,
        error
      );

      throw new DepsCheckerError(
        Messages.failToInstallFuncCoreTool.replace("@NameVersion", installedNameWithVersion),
        functionCoreToolsHelpLink
      );
    }

    // validate after installation.
    const isInstalled = await this.isInstalled();
    if (!isInstalled) {
      DepsCheckerTelemetry.sendSystemErrorEvent(
        DepsCheckerEvent.funcValidation,
        TelemtryMessages.failedToInstallFunc,
        Messages.failToValidateFuncCoreTool.replace("@NameVersion", installedNameWithVersion)
      );

      throw new DepsCheckerError(
        Messages.failToInstallFuncCoreTool.replace("@NameVersion", installedNameWithVersion),
        functionCoreToolsHelpLink
      );
    }

    DepsCheckerTelemetry.sendEvent(DepsCheckerEvent.funcValidationCompleted);
    logger.info(
      Messages.finishInstallFunctionCoreTool.replace("@NameVersion", installedNameWithVersion)
    );
  }
}

async function getInstalledFuncToolsVersion(): Promise<FuncVersion | null> {
  try {
    const output = await cpUtils.executeCommand(
      undefined,
      logger,
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
    await cpUtils.executeCommand(undefined, logger, undefined, "npm", "--version");
    return true;
  } catch (error) {
    // an error indicates no npm
    return false;
  }
}

async function installFuncCoreTools(version: FuncVersion): Promise<void> {
  if (isWindows()) {
    await installFuncCoreToolsOnWindows(version);
  } else {
    await installFuncCoreToolsOnUnix(version);
  }
}

async function installFuncCoreToolsOnWindows(version: FuncVersion): Promise<void> {
  // on Windows, forced install is needed if the func command is broken.
  await cpUtils.executeCommand(
    undefined,
    logger,
    undefined,
    "npm",
    "install",
    "-g",
    "-f",
    `${funcPackageName}@${version}`
  );

  // delete func.ps1 if exists to workaround the powershell execution policy issue:
  // https://github.com/npm/cli/issues/470
  const funcPSScript = await getFuncPSScriptPath();
  if (await fs.pathExists(funcPSScript)) {
    logger.debug(`deleting func.ps1 from ${funcPSScript}`);
    await fs.remove(funcPSScript);
  }
}

async function installFuncCoreToolsOnUnix(version: FuncVersion): Promise<void> {
  const result: cpUtils.ICommandResult = await cpUtils.tryExecuteCommand(
    undefined,
    logger,
    undefined,
    "npm",
    "install",
    "-g",
    `${funcPackageName}@${version}`
  );

  const tryInstallfailed: boolean = result.code !== 0;
  const needAdminPermission: boolean = result.cmdOutputIncludingStderr.includes(
    "permission denied"
  );
  const command = `npm install -g ${funcPackageName}@${version} --unsafe-perm true`;

  if (tryInstallfailed && needAdminPermission && isMacOS()) {
    await cpUtils.execSudo(logger, command);
  } else if (tryInstallfailed) {
    const tryInstallCommand = `npm install -g ${funcPackageName}@${version}`;
    throw new Error(
      `Failed to run "${tryInstallCommand}" command. Check output window for more details.`
    );
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
      "func"
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
