// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

const InstallNode =
  "Go to https://nodejs.org/about/releases/ to install Node.js (v16 is recommended).";

export const doctorConstant = {
  Tick: "√",
  Cross: "×",
  Exclamation: "!",
  WhiteSpace: "   ",
  Check:
    "Teams Toolkit is checking if all required prerequisites are installed and will install them if not. A summary will be generated for your reference.",
  CheckNumber: "We are checking total @number of prerequisites for you.",
  Summary: "Prerequisites Check Summary:",
  RestartVSCode:
    "Restart all your Visual Studio Code instances after the installation is finished.",

  NodeNotFound: `Cannot find Node.js. ${InstallNode}`,
  NodeNotSupported: `Node.js (@CurrentVersion) is not in the supported version list (@SupportedVersions). ${InstallNode}`,
  NodeSuccess: `Supported Node.js version (@Version) is installed`,
  BypassNode12: `To continue to local debug using Node.js v12, go to Visual Studio Code Settings, under Teams Toolkit, Prerequisite Check, uncheck "Ensure Node.js is installed. (node)".`,
  BypassNode12AndFunction: `To continue to local debug using Node.js v12, go to Visual Studio Code Settings, under Teams Toolkit, Prerequisite Check, uncheck "Ensure Node.js is installed. (node)" and "Ensure Azure Functions Core Tools is installed. (funcCoreTools)". Also make sure you install the Azure Functions Core Tools v3. https://github.com/Azure/azure-functions-core-tools`,
  Node12MatchFunction:
    "If you have your own Azure Functions Core Tools installed, make sure it works with new Node.js version. See (https://docs.microsoft.com/azure/azure-functions/functions-versions#languages) for Azure Functions supported Node versions.",
  SignInSuccess: `Microsoft 365 Account (@account) is logged in and sideloading enabled`,
  SignInSuccessWithNewAccount: `You are now using a different Microsoft 365 tenant. Microsoft 365 Account (@account) is logged in and sideloading enabled.`,
  Cert: "Development certificate for localhost",
  CertSuccess: "Development certificate for localhost is installed",
  NpmInstallSuccess: "NPM packages for @app are installed",
  NpmInstallFailure: "NPM Install for @app",
  LaunchServices:
    "Services will be launched locally, please check your terminal window for details.",
  HelpLink: `Please refer to @Link for more information.`,
  LearnMore: `Visit @Link to learn more about prerequisites check.`,
};
