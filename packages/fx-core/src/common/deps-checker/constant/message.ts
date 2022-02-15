// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const Messages = {
  learnMoreButtonText: "Learn more",
  defaultErrorMessage: "Install the required dependencies manually.",

  startInstallFunctionCoreTool: `Downloading and installing @NameVersion.`,
  finishInstallFunctionCoreTool: `Successfully installed @NameVersion.`,
  needReplaceWithFuncCoreToolV3: `You must update to @NameVersion to debug your local functions.`,
  needInstallFuncCoreTool: `You must have @NameVersion installed to debug your local functions.`,
  failToInstallFuncCoreTool: `Failed to install @NameVersion. Install @NameVersion manually.`,
  failToValidateFuncCoreTool: `Failed to validate @NameVersion after installation.`,

  startInstallNgrok: `Downloading and installing @NameVersion.`,
  finishInstallNgrok: `Successfully installed @NameVersion.`,
  needInstallNgrok: `You must have @NameVersion installed to debug your local bot.`,
  failToInstallNgrok: `Failed to install @NameVersion. Install @NameVersion manually.`,
  failToValidateNgrok: `Failed to validate @NameVersion after installation.`,

  downloadDotnet: `Downloading and installing the portable version of @NameVersion, which will be installed to @InstallDir and will not affect your environment.`,
  finishInstallDotnet: `Successfully installed @NameVersion.`,
  useGlobalDotnet: `Using dotnet from PATH:`,
  dotnetInstallStderr: `dotnet-install command failed without error exit code but with non-empty standard error.`,
  dotnetInstallErrorCode: `dotnet-install command failed.`,
  failToInstallDotnet: `Failed to install @NameVersion. Install @NameVersion manually and restart Visual Studio Code.`,

  NodeNotFound: `Cannot find Node.js.

Teams Toolkit requires Node.js; the recommended version is v14.

Click "Learn more" to learn how to install the Node.js.

(If you just installed Node.js, restart Visual Studio Code for the change to take effect.)`,
  NodeNotSupported: `Node.js (@CurrentVersion) is not in the supported version list (@SupportedVersions).

Click "Learn more" to learn more about the supported Node.js versions.

(If you just installed Node.js (@SupportedVersions), restart Visual Studio Code for the change to take effect.)`,

  dotnetNotFound: `Cannot find @NameVersion. For the details why .NET SDK is needed, refer to @HelpLink`,
  depsNotFound: `Cannot find @SupportedPackages.

Teams Toolkit requires these dependencies.

Click "Install" to install @InstallPackages.`,

  linuxDepsNotFound: `Cannot find @SupportedPackages.

Teams Toolkit requires these dependencies. 

(If you just installed @SupportedPackages, restart Visual Studio Code for the change to take effect.)`,

  linuxDepsNotFoundHelpLinkMessage: `Cannot find @SupportedPackages.

Teams Toolkit requires these dependencies.`,
};
