// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class RegularExprs {
  public static readonly CHARS_TO_BE_SKIPPED: RegExp = /[^a-zA-Z\d]/g;
}

export class AADRegistrationConstants {
  public static readonly GRAPH_REST_BASE_URL: string = "https://graph.microsoft.com/v1.0";
  public static readonly AZURE_AD_MULTIPLE_ORGS: string = "AzureADMultipleOrgs";
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
  public static readonly BOT_REGISTRATION_NOTFOUND_ERROR = "BotRegistrationNotFoundError";
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
  public static readonly StatusCode = "status-code";
  public static readonly Url = "url";
  public static readonly Method = "method";
}
