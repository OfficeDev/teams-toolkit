// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

const InstallNode =
  "Go to https://nodejs.org/about/releases/ to install Node.js (recommended version v14)";

export const doctorConstant = {
  Tick: "√",
  Cross: "×",
  Exclamation: "!",
  WhiteSpace: "   ",
  Check:
    "Teams Toolkit is checking if all the prerequisites are installed and trying to install the missing ones. A summary report will be generated later for further tasks to you might need to perform.",
  Summary: "Prerequisites Check Summary:",
  RestartVSCode:
    "Restart all your Visual Studio Code instances after the installation is finished.",
  NodeNotFound: `Cannot find Node.js. ${InstallNode}`,
  NodeNotSupported: `Node.js (@CurrentVersion) is not in the supported version list (@SupportedVersions). ${InstallNode}`,
  SignInCancelled:
    "Sign in cancelled. The Teams Toolkit requires a Microsoft 365 organizational account where Teams is running and has been registered.",
  HelpLink: `Please refer to @Link for more information.`,
  LearnMore: `Visit @Link to learn more about prerequisites check.`,
};
