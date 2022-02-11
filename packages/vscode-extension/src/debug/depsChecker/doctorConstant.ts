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
    "Teams Toolkit is checking if all required prerequisites are installed and will install them if not, if you wish to bypass checking and installing any prerequisistes, you can disable them in Visual Studio Code settings. A summary will be generated for your reference.",
  CheckNumber: "We are checking total {$number} of prerequisistes for you.",
  Summary: "Prerequisites Check Summary:",
  RestartVSCode:
    "Restart all your Visual Studio Code instances after the installation is finished.",

  NodeNotFound: `Cannot find Node.js. ${InstallNode}`,
  NodeNotSupported: `Node.js (@CurrentVersion) is not in the supported version list (@SupportedVersions). ${InstallNode}`,
  NodeSuccess: `Supported Node.js version (@Version) is installed`,
  SignInSuccess: `M365 Account (@account) is logged in and sidelaoding enabled`,
  Cert: "Development certificate for localhost",
  CertSuccess: "Devlopment certification for localhost is installed",
  NpmInstallSuccess: "NPM Install for @app is executed",
  NpmInstallFailue: "NPM Install for @app",
  LaunchServices:
    "Services will be launched locally, please check your terminal window for deatils.",
  HelpLink: `Please refer to @Link for more information.`,
  LearnMore: `Visit @Link to learn more about prerequisites check.`,
};
