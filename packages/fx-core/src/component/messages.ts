// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Effect } from "@microsoft/teamsfx-api";
import {
  DeployProgress,
  PostProvisionProgress,
  ScaffoldProgress,
} from "../plugins/resource/frontend/resources/steps";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";

export class ProgressTitles {
  static readonly scaffoldTab = ScaffoldProgress.title;
  static readonly scaffoldBot = "Scaffolding Bot";
  static readonly scaffoldApi = "Scaffolding Api";
  static readonly buildingTab = "Building Tab";
  static readonly buildingBot = "Building Bot";
  static readonly buildingApi = "Building Api";
  static readonly provisionBot = "Registering Bot";
  static readonly configureStorage = PostProvisionProgress.title;
  // Deploying Azure Functions [Bot]
  static readonly deploying = (component: string, scenario?: string): string =>
    `Deploying ${component}` + (scenario ? `[${scenario}]` : "");
  static readonly deployingStorage = DeployProgress.title;
}

export class ProgressMessages {
  static readonly scaffoldTab = ScaffoldProgress.steps.Scaffold;
  static readonly scaffoldBot = "Retrieving templates.";
  static readonly scaffoldApi = "Scaffolding Function Api project.";
  static readonly buildingTab = DeployProgress.steps.Build;
  static readonly buildingBot = "Installing dependencies.";
  static readonly buildingApi = "Building Function Api.";
  static readonly packingCode = "Creating application package.";
  static readonly enableStaticWebsite = PostProvisionProgress.steps.EnableStaticWebsite;
  static readonly provisionBot = "Registering bot.";
}

export class LogMessages {
  static readonly updateFunctionAppSettings = "Updating Azure Function app settings.";
  static readonly enableStaticWebsite = "Enabling static website feature for Azure Storage.";
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
  static readonly programmingLanguageInvalid =
    "Invalid programming language found in project settings.";
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
