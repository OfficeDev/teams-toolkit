/* eslint-disable @typescript-eslint/no-var-requires */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
const opn = require("opn");
import { installedNameWithVersion as funcInstalledNameWithVersion } from "./funcToolChecker";
import { installedNameWithVersion as dotnetInstalledNameWithVersion } from "./dotnetCheckerImpl";

export async function openUrl(url: string): Promise<void> {
  // Using this functionality is blocked by https://github.com/Microsoft/vscode/issues/25852
  // Specifically, opening the Live Metrics Stream for Linux Function Apps doesn't work in this extension.
  // await vscode.env.openExternal(vscode.Uri.parse(url));

  opn(url);
}

export function isWindows() {
  return os.type() === "Windows_NT";
}

export function isMacOS() {
  return os.type() === "Darwin";
}

export function isLinux() {
  return os.type() === "Linux";
}

export const Messages = {
  defaultErrorMessage: "Please install the required dependencies manually.",

  startInstallFunctionCoreTool: `Downloading and installing ${funcInstalledNameWithVersion}.`,
  finishInstallFunctionCoreTool: `Successfully installed ${funcInstalledNameWithVersion}.`,
  needReplaceWithFuncCoreToolV3: `You must replace with ${funcInstalledNameWithVersion} to debug your local functions.`,
  needInstallFuncCoreTool: `You must have ${funcInstalledNameWithVersion} installed to debug your local functions.`,
  failToInstallFuncCoreTool: `${funcInstalledNameWithVersion} installation has failed and will have to be installed manually.`,

  downloadDotnet: `Downloading and installing ${dotnetInstalledNameWithVersion}.`,
  finishInstallDotnet: `Successfully installed ${dotnetInstalledNameWithVersion}.`,
  useGlobalDotnet: `Use global dotnet from PATH.`,
  dotnetInstallStderr: `dotnet-install command failed without error exit code but with non-empty standard error.`,
  dotnetInstallErrorCode: `dotnet-install command failed.`,
  failToInstallDotnet: `Failed to install ${dotnetInstalledNameWithVersion}.`,

  depsNotFound: `The toolkit cannot find @Message on your machine.

As a fundamental runtime context for Teams app, these dependencies are required. Following steps will help you to install the appropriate version to run the Microsoft Teams Toolkit.

Click "Install" to continue.`
}

export const defaultHelpLink = "https://review.docs.microsoft.com/en-us/mods/?branch=main";
export const functionCoreToolsHelpLink = "https://review.docs.microsoft.com/en-us/mods/?branch=main";
export const dotnetHelpLink = "https://review.docs.microsoft.com/en-us/mods/?branch=main";
