// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import { Logger } from "../logger";
import { DepsCheckerError } from "./errors";
import { dotnetChecker, DotnetChecker } from "./dotnetChecker";
import { ConfigMap, returnUserError, FxError } from "fx-api";
import { Messages, dotnetHelpLink } from "./common";

export { cpUtils } from "./cpUtils";
export const logger = Logger;

const downloadIndicatorInterval = 1000; // same as vscode-dotnet-runtime
let enabled = false;

export function dotnetCheckerEnabled(): boolean {
  // TODO: enable dotnet checker after all features are ready
  // return enabled;
  return false;
}

export async function runWithProgressIndicator(
  callback: () => Promise<void>
): Promise<void> {
  // NOTE: We cannot use outputChannel in plugin to print the dots in one line.
  let counter = 1;
  const timer = setInterval(() =>  {
    const dots = Array(counter).fill(".").join("");
    logger.info(dots);
    counter += 1;
  }, downloadIndicatorInterval);
  try {
    await callback();
  } finally {
    clearTimeout(timer);
  }
}

export async function displayLearnMore(message: string, link: string): Promise<boolean> {
  // TODO: implement learn more popup in plugin
  return true;
}

export async function displayWarningMessage(
  message: string,
  buttonText: string,
  action: () => Promise<boolean>
): Promise<boolean> {
  return await action();
}

export async function displayContinueWithLearnMore(
  message: string,
  link: string
): Promise<boolean> {
  return true;
}

export function showOutputChannel(): void {
  // TODO: find a way to implement in plugin
}

export function getResourceDir(): string {
  return path.resolve(path.join(__dirname, "..", "..", "..", "..", "..", "..", "resource", "plugins", "resource", "function"));
}

const answerKey = "function-dotnet-checker-enabled";

export function setFeatureFlag(answers?: ConfigMap): void {
  enabled = answers?.getBoolean(answerKey) || false;
}

// get dotnet exec path and escape for shell execution
export async function getDotnetForShell(): Promise<string> {
  const execPath = await dotnetChecker.getDotnetExecPath();
  return DotnetChecker.escapeFilePath(execPath);
}

export function handleDotnetError(error: Error): void {
  if (error instanceof DepsCheckerError) {
    throw returnUserError(error, "function", "DepsCheckerError", error.helpLink, error);
  } else {
    throw returnUserError(new Error(Messages.defaultErrorMessage), "function", "DepsCheckerError", dotnetHelpLink, error);
  }
}

export namespace ExtTelemetry {
  export function sendTelemetryEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
  }

  export function sendTelemetryErrorEvent(
    eventName: string,
    error: FxError,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number },
    errorProps?: string[]
  ): void {
  }

  export function sendTelemetryException(
    error: Error,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {
  }
}

export enum TelemetryProperty {
  Component = "component",
}
