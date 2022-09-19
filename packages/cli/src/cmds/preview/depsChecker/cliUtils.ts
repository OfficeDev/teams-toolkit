// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CliConfigEnvChecker, CliConfigOptions, UserSettings } from "../../../userSetttings";
import CLIUIInstance from "../../../userInteraction";
import { DepsCheckerEvent } from "@microsoft/teamsfx-core/build/common/deps-checker";
import { cliEnvCheckerTelemetry } from "./cliTelemetry";
import * as os from "os";

export function isWindows(): boolean {
  return os.type() === "Windows_NT";
}

export async function showWarningMessage(message: string, button: string): Promise<boolean> {
  const res = await CLIUIInstance.showMessage("info", message, true, button);
  const input: string | undefined = res?.isOk() ? res.value : undefined;
  return input === button;
}

export async function openUrl(url: string): Promise<void> {
  await CLIUIInstance.openUrl(url);
}

export async function isDotnetCheckerEnabled(): Promise<boolean> {
  return await checkerEnabled(CliConfigOptions.EnvCheckerValidateDotnetSdk);
}

export async function isFuncCoreToolsEnabled(): Promise<boolean> {
  const isFuncCoreToolsEnabled = await checkerEnabled(
    CliConfigOptions.EnvCheckerValidateFuncCoreTools
  );
  if (!isFuncCoreToolsEnabled) {
    cliEnvCheckerTelemetry.sendEvent(DepsCheckerEvent.funcCheckSkipped);
  }
  return isFuncCoreToolsEnabled;
}

export async function isNodeCheckerEnabled(): Promise<boolean> {
  const isNodeCheckerEnabled = await checkerEnabled(CliConfigOptions.EnvCheckerValidateNode);
  if (!isNodeCheckerEnabled) {
    cliEnvCheckerTelemetry.sendEvent(DepsCheckerEvent.nodeCheckSkipped);
  }
  return isNodeCheckerEnabled;
}

export async function isNgrokCheckerEnabled(): Promise<boolean> {
  return await checkerEnabled(CliConfigOptions.EnvCheckerValidateNgrok);
}

export async function isTrustDevCertEnabled(): Promise<boolean> {
  return await checkerEnabled(CliConfigOptions.TrustDevCert);
}

export async function checkerEnabled(key: string): Promise<boolean> {
  const result = await UserSettings.getConfigSync();
  if (result.isErr()) {
    return true;
  }

  const config = result.value;

  if (key in config) {
    return config[key] === CliConfigEnvChecker.On;
  } else {
    return true;
  }
}
