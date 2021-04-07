// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const frontendStartCommand = "frontend start";
export const backendStartCommand = "backend start";
export const authStartCommand = "auth start";
export const ngrokStartCommand = "ngrok start";
export const botStartCommand = "bot start";

export const frontendProblemMatcher = "$teamsfx-frontend-watch";
export const backendProblemMatcher = "$teamsfx-backend-watch";
export const authProblemMatcher = "$teamsfx-auth-watch";
export const ngrokProblemMatcher = "$teamsfx-ngrok-watch";
export const botProblemMatcher = "$teamsfx-bot-watch";

export const frontendFolderName = "tabs";
export const backendFolderName = "api";
export const botFolderName = "bot";

export const localEnvFileName = "local.env";
export const manifestFileName = "manifest.remote.json";

export const frontendLocalEnvPrefix = "FRONTEND_";
export const backendLocalEnvPrefix = "BACKEND_";
export const authLocalEnvPrefix = "AUTH_";
export const authServicePathEnvKey = "AUTH_SERVICE_PATH";
export const botLocalEnvPrefix = "BOT_";

export class Messages {
  public static readonly installButtonText = "Install";
  public static readonly learnMoreButtonText = "Learn more";
  public static readonly needInstallFuncCoreToolV3 =
    "You must have the Azure Functions Core Tools v3 installed to debug your local functions.";
  public static readonly needReplaceWithFuncCoreToolV3 =
    "You must replace with the Azure Functions Core Tools v3 to debug your local functions.";
  public static readonly failToInstallFuncCoreTool =
    "The Azure Functions Core Tools v3 installation has failed and will have to be installed manually.";

  public static readonly failToDetectOrInstallDotnet =
    "Failed to detect or install .NET Core SDK, please install .NET Core SDK yourself and update the config file '@ConfigPath' or create it if it does not exist.";
  public static readonly failToInstallBackendExtensions = "Failed to install backend extensions.";
  public static readonly linuxNotSupported = "Linux platform is not supported, please install the required dependencies manually.";
}

export enum PackageManager {
  npm = "npm",
  brew = "brew"
}

// TODO: replace with the correct link of teamsfx documentation
export const funcCoreToolsHelpLink = "https://aka.ms/Dqur4e";
export const funcCliPath = "func";
export const funcPackageName = "azure-functions-core-tools";

export const configurationPrefix = "fx-extension";
export const validateFuncCoreToolsKey = "validateFuncCoreTools";
export const validateDotnetSdkKey = "validateDotnetSdk";

// TODO: replace with the correct link of teamsfx documentation
export const dotnetHelpLink = "https://dotnet.microsoft.com/download";
// TODO: replace with the correct link of teamsfx documentation
export const backendExtensionsHelpLink = "https://dotnet.microsoft.com/download";
