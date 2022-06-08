// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { OptionItem, ConfigFolderName } from "@microsoft/teamsfx-api";
import { ProgrammingLanguage } from "./enums/programmingLanguage";
import path from "path";
import { BotNotificationTriggers } from "../../solution/fx-solution/question";

export class RegularExprs {
  public static readonly CHARS_TO_BE_SKIPPED: RegExp = /[^a-zA-Z\d]/g;
  public static readonly RESOURCE_SUFFIX: RegExp = /[\da-z]{1,16}/;
  // Refer to https://docs.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules
  // 1-40 Alphanumerics and hyphens.
  public static readonly APP_SERVICE_PLAN_NAME: RegExp = /^[a-zA-Z\d\-]{1,40}$/;
  // 2-60 Contains alphanumerics and hyphens.Can't start or end with hyphen.
  public static readonly WEB_APP_SITE_NAME: RegExp = /^[a-zA-Z\d][a-zA-Z\d\-]{0,58}[a-zA-Z\d]$/;
  // 2-64 Alphanumerics, underscores, periods, and hyphens. Start with alphanumeric.
  public static readonly BOT_CHANNEL_REG_NAME: RegExp = /^[a-zA-Z\d][a-zA-Z\d_.\-]{1,63}$/;
}

export class WebAppConstants {
  public static readonly WEB_APP_SITE_DOMAIN: string = "azurewebsites.net";
}

export class AADRegistrationConstants {
  public static readonly GRAPH_REST_BASE_URL: string = "https://graph.microsoft.com/v1.0";
  public static readonly AZURE_AD_MULTIPLE_ORGS: string = "AzureADMultipleOrgs";
}

export class TemplateProjectsConstants {
  public static readonly GROUP_NAME_BOT: string = "bot";
  public static readonly GROUP_NAME_BOT_MSGEXT: string = "bot-msgext";
}

export enum TemplateProjectsScenarios {
  DEFAULT_SCENARIO_NAME = "default",
  NOTIFICATION_RESTIFY_SCENARIO_NAME = "notification-restify",
  NOTIFICATION_WEBAPI_SCENARIO_NAME = "notification-webapi",
  NOTIFICATION_FUNCTION_BASE_SCENARIO_NAME = "notification-function-base",
  NOTIFICATION_FUNCTION_TRIGGER_HTTP_SCENARIO_NAME = "notification-trigger-http",
  NOTIFICATION_FUNCTION_TRIGGER_TIMER_SCENARIO_NAME = "notification-trigger-timer",
  COMMAND_AND_RESPONSE_SCENARIO_NAME = "command-and-response",
  M365_SCENARIO_NAME = "m365",
}

export const TriggerTemplateScenarioMappings = {
  [BotNotificationTriggers.Http]:
    TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_HTTP_SCENARIO_NAME,
  [BotNotificationTriggers.Timer]:
    TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_TIMER_SCENARIO_NAME,
} as const;

export const DEFAULT_DOTNET_FRAMEWORK = "net6.0";

export class ProgressBarConstants {
  public static readonly SCAFFOLD_TITLE: string = "Scaffolding bot";
  public static readonly SCAFFOLD_STEP_START = "Scaffolding bot.";
  public static readonly SCAFFOLD_STEP_FETCH_ZIP = "Retrieving templates.";

  public static readonly SCAFFOLD_STEPS_NUM: number = 2;

  public static readonly SCAFFOLD_FUNCTIONS_NOTIFICATION_STEP_START =
    "Scaffolding notification bot.";
  public static readonly SCAFFOLD_FUNCTIONS_NOTIFICATION_STEP_FETCH_PROJECT_TEMPLATE =
    "Retrieving project templates.";
  public static readonly SCAFFOLD_FUNCTIONS_NOTIFICATION_STEP_FETCH_TRIGGER_TEMPLATE =
    "Retrieving trigger templates.";

  public static readonly SCAFFOLD_FUNCTIONS_NOTIFICATION_STEPS_NUM: number = 3;

  public static readonly PROVISION_TITLE: string = "Provisioning bot";
  public static readonly PROVISION_STEP_START = "Provisioning bot.";
  public static readonly PROVISION_STEP_BOT_REG = "Registering bot.";

  public static readonly PROVISION_STEPS_NUM: number = 2;

  public static readonly LOCAL_DEBUG_TITLE: string = "Local debugging";
  public static readonly LOCAL_DEBUG_STEP_START = "Provisioning bot for local debug.";
  public static readonly LOCAL_DEBUG_STEP_BOT_REG = "Registering bot.";

  public static readonly LOCAL_DEBUG_STEPS_NUM: number = 1;

  public static readonly DEPLOY_TITLE: string = "Deploying bot";
  public static readonly DEPLOY_STEP_START = "Deploying bot.";
  public static readonly DEPLOY_STEP_NPM_INSTALL = "Installing dependencies.";
  public static readonly DEPLOY_STEP_ZIP_FOLDER = "Creating application package.";
  public static readonly DEPLOY_STEP_ZIP_DEPLOY = "Uploading application package.";

  public static readonly DEPLOY_STEPS_NUM: number = 3;
}

export class QuestionNames {
  public static readonly CAPABILITIES = "capabilities";
  public static readonly BOT_HOST_TYPE_TRIGGER = "bot-host-type-trigger";
}

export class LifecycleFuncNames {
  public static readonly SCAFFOLD = "scaffold";
  public static readonly GET_QUETSIONS_FOR_SCAFFOLDING = "get-questions-for-scaffolding";
  public static readonly GET_QUETSIONS_FOR_USER_TASK = "get-questions-for-user-task";

  public static readonly PRE_PROVISION = "pre-provision";
  public static readonly PROVISION = "provision";
  public static readonly POST_PROVISION = "post-provision";

  public static readonly PRE_DEPLOY = "pre-deploy";
  public static readonly DEPLOY = "deploy";

  public static readonly LOCAL_DEBUG = "local-debug";
  public static readonly POST_LOCAL_DEBUG = "post-local-debug";

  public static readonly GENERATE_ARM_TEMPLATES = "generate-arm-templates";
}

export class Retry {
  public static readonly RETRY_TIMES = 10;
  public static readonly BACKOFF_TIME_MS = 5000;
}

export class ErrorNames {
  // System Exceptions
  public static readonly PRECONDITION_ERROR = "PreconditionError";
  public static readonly PROVISION_ERROR = "ProvisionError";
  public static readonly CONFIG_UPDATING_ERROR = "ConfigUpdatingError";
  public static readonly CONFIG_VALIDATION_ERROR = "ConfigValidationError";
  public static readonly MSG_ENDPOINT_UPDATING_ERROR = "MessageEndpointUpdatingError";
  public static readonly COMMAND_EXECUTION_ERROR = "CommandExecutionError";
  public static readonly CALL_APPSTUDIO_API_ERROR = "CallAppStudioAPIError";

  // User Exceptions
  public static readonly PACK_DIR_EXISTENCE_ERROR = "PackDirectoryExistenceError";
}

export class Links {
  public static readonly ISSUE_LINK = "https://github.com/OfficeDev/TeamsFx/issues/new";
  public static readonly HELP_LINK = "https://aka.ms/teamsfx-bot-help";
}

export class Alias {
  public static readonly TEAMS_BOT_PLUGIN = "BT";
  public static readonly BICEP_MODULE = "bot";
}

export class QuestionOptions {
  public static readonly PROGRAMMING_LANGUAGE_OPTIONS: OptionItem[] = Object.values(
    ProgrammingLanguage
  ).map((value) => {
    return {
      id: value,
      label: value,
    };
  });
}

export class DeployConfigs {
  public static readonly UN_PACK_DIRS = ["node_modules", "package-lock.json"];
  public static readonly DEPLOYMENT_FOLDER = ".deployment";
  public static readonly DEPLOYMENT_CONFIG_FILE = "bot.json";
  public static readonly WALK_SKIP_PATHS = [
    "node_modules/.bin",
    `.${ConfigFolderName}`,
    DeployConfigs.DEPLOYMENT_FOLDER,
    ".vscode",
    "*.js.map",
    "*.ts.map",
    "*.ts",
    ".git*",
    ".tsbuildinfo",
    "CHANGELOG.md",
    "readme.md",
    "local.settings.json",
    "test",
    "tsconfig.json",
    ".DS_Store",
    "node_modules/ts-node",
    "node_modules/typescript",
  ];
}

export class ConfigKeys {
  public static readonly SITE_NAME = "siteName";
  public static readonly SITE_ENDPOINT = "siteEndpoint";
  public static readonly APP_SERVICE_PLAN = "appServicePlan";
  public static readonly BOT_CHANNEL_REG_NAME = "botChannelRegName";
}

export class FolderNames {
  public static readonly NODE_MODULES = "node_modules";
  public static readonly KEYTAR = "keytar";
}

export class TypeNames {
  public static readonly NUMBER = "number";
}

export class MaxLengths {
  public static readonly AAD_DISPLAY_NAME = 120;
}

export class TelemetryKeys {
  public static readonly Component = "component";
  public static readonly Success = "success";
  public static readonly ErrorType = "error-type";
  public static readonly ErrorMessage = "error-message";
  public static readonly ErrorCode = "error-code";
  public static readonly AppId = "appid";
  public static readonly HostType = "bot-host-type";
  public static readonly BotCapabilities = "bot-capabilities";
}

export class TelemetryValues {
  public static readonly Success = "yes";
  public static readonly Fail = "no";
  public static readonly UserError = "user";
  public static readonly SystemError = "system";
}

export class AzureConstants {
  public static readonly requiredResourceProviders = ["Microsoft.Web", "Microsoft.BotService"];
}

export class PathInfo {
  public static readonly BicepTemplateRelativeDir = path.join(
    "plugins",
    "resource",
    "bot",
    "bicep"
  );
  public static readonly ProvisionModuleTemplateFileName = "botProvision.template.bicep";
  public static readonly FuncHostedProvisionModuleTemplateFileName =
    "funcHostedBotProvision.template.bicep";
  public static readonly ConfigurationModuleTemplateFileName = "botConfiguration.template.bicep";
}

export class BotBicep {
  static readonly resourceId: string = "provisionOutputs.botOutput.value.botWebAppResourceId";
  static readonly hostName: string = "provisionOutputs.botOutput.value.validDomain";
  static readonly webAppEndpoint: string = "provisionOutputs.botOutputs.value.botWebAppEndpoint";
}

export const CustomizedTasks = {
  addCapability: "addCapability",
  addFeature: "addFeature",
} as const;
