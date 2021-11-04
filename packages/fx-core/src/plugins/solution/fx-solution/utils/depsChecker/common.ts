/* eslint-disable @typescript-eslint/no-var-requires */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// NOTE:
// DO NOT EDIT this file in function plugin.
// The source of truth of this file is in packages/vscode-extension/src/debug/depsChecker.
// If you need to edit this file, please edit it in the above folder
// and run the scripts (tools/depsChecker/copyfiles.sh or tools/depsChecker/copyfiles.ps1 according to your OS)
// to copy you changes to function plugin.

import * as os from "os";

export function isWindows(): boolean {
  return os.type() === "Windows_NT";
}

export function isMacOS(): boolean {
  return os.type() === "Darwin";
}

export function isLinux(): boolean {
  return os.type() === "Linux";
}

// help links
export const defaultHelpLink = "https://aka.ms/teamsfx-envchecker-help";
export const bicepHelpLink = `${defaultHelpLink}#how-to-install-bicep-cli`;

export const Messages = {
  learnMoreButtonText: "Learn more",

  downloadBicep: `Downloading and installing the portable version of @NameVersion, which will be installed to @InstallDir and will not affect your environment.`,
  finishInstallBicep: `Successfully installed @NameVersion.`,
  failToInstallBicep: `Failed to install @NameVersion`,
  failToInstallBicepOutputVSC: `Failed to install @NameVersion. please read this wiki(@HelpLink) to install @NameVersion manually and restart Visual Studio Code.`,
  failToInstallBicepOutputCLI: `Failed to install @NameVersion. please read this wiki(@HelpLink) to install @NameVersion manually.`,
  failToInstallBicepDialog: `Failed to install @NameVersion. please click Learn More to install @NameVersion manually and restart Visual Studio Code.`,
};

export enum DepsCheckerEvent {
  // since FuncToolChecker is disabled and azure functions core tools will be installed as devDependencies now,
  // below events related to FuncToolChecker won't be displayed to end user.
  bicepCheckSkipped = "bicep-check-skipped",
  bicepAlreadyInstalled = "bicep-already-installed",
  bicepInstallCompleted = "bicep-install-completed",
  bicepInstallError = "bicep-install-error",
  bicepInstallScriptCompleted = "bicep-install-script-completed",
  bicepInstallScriptError = "bicep-install-script-error",
  bicepValidationError = "bicep-validation-error",

  clickLearnMore = "env-checker-click-learn-more",
  clickCancel = "env-checker-click-cancel",
}

export enum TelemtryMessages {
  failedToInstallBicep = "failed to install Bicep.",
  failedToValidateBicep = "failed to validate Bicep.",
}

export enum TelemetryMeasurement {
  completionTime = "completion-time",
  OSArch = "os-arch",
  OSRelease = "os-release",
  Component = "component",
}
