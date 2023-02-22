// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Effect } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";

export class ProgressTitles {
  static readonly scaffoldTab = getLocalizedString("core.progress.scaffoldTab");
  static readonly scaffoldBot = getLocalizedString("core.progress.scaffoldBot");
  static readonly scaffoldApi = getLocalizedString("core.progress.scaffoldApi");
  static readonly buildingTab = getLocalizedString("core.progress.buildingTab");
  static readonly buildingBot = getLocalizedString("core.progress.buildingBot");
  static readonly buildingApi = getLocalizedString("core.progress.buildingApi");
  static readonly provisionBot = getLocalizedString("core.progress.provisionBot");
  static readonly generateTemplate = getLocalizedString("core.progress.generateTemplate");
  static readonly generateSample = getLocalizedString("core.progress.generateSample");
  static readonly configureStorage = getLocalizedString("core.progress.configureStorage");
  // Deploying Azure Functions [Bot]
  static readonly deploying = (component: string, scenario?: string): string =>
    `Deploying ${component}` + (scenario ? `[${scenario}]` : "");
}

export class ProgressMessages {
  static readonly scaffoldTab = getLocalizedString("core.progress.scaffoldTab.detail");
  static readonly scaffoldBot = getLocalizedString("core.progress.scaffoldBot.detail");
  static readonly scaffoldApi = getLocalizedString("core.progress.scaffoldApi.detail");
  static readonly buildingTab = getLocalizedString("core.progress.buildingTab.detail");
  static readonly buildingBot = getLocalizedString("core.progress.buildingBot.detail");
  static readonly buildingApi = getLocalizedString("core.progress.buildingApi.detail");
  static readonly packingCode = () => getLocalizedString("core.progress.packingCode");
  static readonly enableStaticWebsite = getLocalizedString("core.progress.enableStaticWebsite");
  static readonly provisionBot = getLocalizedString("core.progress.provisionBot");
  static readonly generateTemplate = () =>
    getLocalizedString("core.progress.generateTemplate.detail");
  static readonly generateSample = () => getLocalizedString("core.progress.generateSample.detail");
  static readonly getDeploymentSrcAndDest = getLocalizedString(
    "core.progress.getDeploymentSrcAndDest"
  );
  static readonly clearStorageAccount = getLocalizedString("core.progress.clearStorageAccount");
  static readonly uploadTabToStorage = getLocalizedString("core.progress.uploadTabToStorage");
  static readonly getAzureAccountInfoForDeploy = () =>
    getLocalizedString("core.progress.getAzureAccountInfoForDeploy");
  static readonly getAzureUploadEndpoint = () =>
    getLocalizedString("core.progress.getAzureUploadEndpoint");
  static readonly uploadZipFileToAzure = () =>
    getLocalizedString("core.progress.uploadZipFileToAzure");
  static readonly checkAzureDeployStatus = () =>
    getLocalizedString("core.progress.checkAzureDeployStatus");
  static readonly restartAzureFunctionApp = () =>
    getLocalizedString("core.progress.restartAzureFunctionApp");
  static readonly restartAzureService = getLocalizedString("core.progress.restartAzureFunctionApp");
  static readonly configureAzureStorageEnableStaticWebsite = getLocalizedString(
    "core.progress.configureAzureStorage"
  );
  static readonly checkAzureStorageEnableStaticWebsite = getLocalizedString(
    "core.progress.checkAzureStorageStaticWebsite"
  );
  static readonly azureStorageStaticWebsiteAlreadyEnabled = getLocalizedString(
    "core.progress.azureStorageStaticWebsiteEnabled"
  );
  static readonly enableAzureStorageStaticWebsite = getLocalizedString(
    "core.progress.enableAzureStorageStaticWebsite"
  );
  static readonly getAzureStorageAccountInfo = () =>
    getLocalizedString("core.progress.getAzureStorageDeployCredential");
  static readonly clearStorageExistsBlobs = () =>
    getLocalizedString("core.progress.clearStorageExistsBlobs");
  static readonly uploadFilesToStorage = () =>
    getLocalizedString("core.progress.uploadFilesToStorage");
}

export class LogMessages {
  static readonly updateFunctionAppSettings = getLocalizedString(
    "core.log.updateFunctionAppSettings"
  );
  static readonly enableStaticWebsite = getLocalizedString("core.progress.enableStaticWebsite");
  public static readonly getTemplateFrom = (url: string): string =>
    getLocalizedString("plugins.function.getTemplateFrom", url);
  public static readonly getTemplateFromLocal = getLocalizedString(
    "plugins.function.getTemplateFromLocal"
  );
  public static readonly projectScaffoldAt = (basePath: string): string =>
    getLocalizedString("plugins.function.projectScaffoldAt", basePath);
  public static readonly failedToInstallDotnet = (error: Error): string =>
    getLocalizedString("plugins.function.failedToInstallDotnet", error);
  public static readonly askFunctionName: string = getLocalizedString(
    "plugins.function.askFunctionName"
  );
  static readonly FailedSaveEnv = (envPath: string): string =>
    getLocalizedString("error.frontend.FailedSaveEnv", envPath);
  static readonly FailedLoadEnv = (envPath: string): string =>
    getLocalizedString("error.frontend.FailedLoadEnv", envPath);
}

export interface LocalizedMessage {
  default: string;
  localized: string;
}

export const getLocalizedMessage = (key: string, ...params: any[]): LocalizedMessage => ({
  default: getDefaultString(key, params),
  localized: getLocalizedString(key, params),
});

export function concatErrorMessageWithSuggestions(
  message: LocalizedMessage,
  suggestions: LocalizedMessage[]
): LocalizedMessage {
  return {
    default: getDefaultString(
      "plugins.baseErrorMessage",
      message.default,
      suggestions.map((suggestion) => suggestion.default).join(" ")
    ),
    localized: getLocalizedString(
      "plugins.baseErrorMessage",
      message.localized,
      suggestions.map((suggestion) => suggestion.localized).join(" ")
    ),
  };
}

export class ErrorMessage {
  static readonly programmingLanguageInvalid = getLocalizedString(
    "core.error.programmingLanguageInvalid"
  );
  public static readonly SomethingIsMissing = (something: string): LocalizedMessage =>
    getLocalizedMessage("plugins.bot.SomethingIsMissing", something);
  public static readonly SomethingIsNotExisting = (something: string): LocalizedMessage =>
    getLocalizedMessage("plugins.bot.SomethingNotExisting", something);
  public static readonly WorkingDirIsMissing: LocalizedMessage = getLocalizedMessage(
    "plugins.bot.WorkingDirMissing"
  );
  public static readonly invalidFunctionName: string = getLocalizedString(
    "plugins.function.invalidFunctionName"
  );
  public static readonly functionAlreadyExists: string = getLocalizedString(
    "plugins.function.functionAlreadyExists"
  );

  // Suggestions
  public static readonly RetryTheCurrentStep: LocalizedMessage = getLocalizedMessage(
    "suggestions.retryTheCurrentStep"
  );
  public static readonly RecreateTheProject: LocalizedMessage = getLocalizedMessage(
    "plugins.bot.RecreateProject"
  );
  public static readonly CheckOutputLogAndTryToFix = getLocalizedMessage(
    "plugins.bot.CheckLogAndFix"
  );
  public static readonly ReopenWorkingDir = (path = ""): LocalizedMessage =>
    getLocalizedMessage("plugins.bot.CheckPathWriteAccess", path);
  public static readonly RunFailedCommand = (command: string, path: string): LocalizedMessage =>
    getLocalizedMessage("plugins.bot.RunFailedCommand", command, path);
  public static readonly CheckCommandOutputAndTryToFixIt: LocalizedMessage = getLocalizedMessage(
    "plugins.bot.CheckCommandOutput"
  );
}

export class Plans {
  static readonly scaffold = (scenario: string, folder: string): Effect =>
    `scaffold ${scenario} source code in folder: ${folder}`;
  static readonly buildProject = (folder: string): Effect => `build project: ${folder}`;
  static readonly deploy = (component: string, folder: string): Effect => ({
    type: "service",
    name: "azure",
    remarks: `deploy ${component} in folder: ${folder}`,
  });
  static readonly enableStaticWebsite = (): Effect => ({
    type: "service",
    name: "azure",
    remarks: "configure azure storage (enable static web site)",
  });
  static readonly createAADforBot = (): Effect => ({
    type: "service",
    name: "graph.microsoft.com",
    remarks: "create AAD app for bot service (botId, botPassword)",
  });
  static readonly registerBot = (): Effect => ({
    type: "service",
    name: "teams.microsoft.com",
    remarks: "create bot registration",
  });
  static readonly updateBotEndpoint = (): Effect => ({
    type: "service",
    name: "graph.microsoft.com",
    remarks: "update message endpoint in AppStudio",
  });
  static readonly generateSourceCodeAndConfig = (feature: string): Effect =>
    `generate source code and config for ${feature} in project settings`;
  static readonly generateBicepAndConfig = (feature: string): Effect =>
    `generate bicep and config for ${feature} in project settings`;
  static readonly addFeature = (feature: string): Effect => `config ${feature} in project settings`;
}
