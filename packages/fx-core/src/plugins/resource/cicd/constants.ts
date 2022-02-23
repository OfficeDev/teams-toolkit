// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class LifecycleFuncNames {
  public static readonly ADD_CICD_WORKFLOWS = "add-cicd-workflows";
}

export class ErrorNames {
  public static readonly INTERNAL_ERROR = "InternalError";
  public static readonly NO_PROJECT_OPENED_ERROR = "NoProjectOpenedError";
  public static readonly FILE_SYSTEM_ERROR = "FileSystemError";
}

export class Alias {
  public static readonly TEAMS_CICD_PLUGIN = "CICD";
  public static readonly TEAMS_FX = "Teamsfx";
}

export class TelemetryKeys {
  public static readonly Component = "component";
  public static readonly Success = "success";
  public static readonly ErrorType = "error-type";
  public static readonly ErrorMessage = "error-message";
  public static readonly ErrorCode = "error-code";
  public static readonly AppId = "appid";
}

export class TelemetryValues {
  public static readonly Success = "yes";
  public static readonly Fail = "no";
  public static readonly UserError = "user";
  public static readonly SystemError = "system";
}

export class PluginSolution {
  public static readonly PLUGIN_NAME = "solution";
  public static readonly REMOTE_TEAMS_APPID = "remoteTeamsAppId";
}

export class PluginCICD {
  public static readonly PLUGIN_NAME = "fx-resource-cicd";
}

export class Suggestions {
  public static readonly RETRY_THE_CURRENT_STEP = "Please retry the current step.";
  public static readonly CREATE_PROJECT_OR_OPEN_EXISTING =
    "Create a new project or open an existing one.";
  public static readonly CHECK_PERMISSION = "Please check if you got sufficient permission.";
}

export class URLPrefixes {
  public static readonly CICD_TEMPLATES =
    "https://raw.githubusercontent.com/OfficeDev/TeamsFx/ruhe/cicd_scaffolding/packages/fx-core/templates/plugins/resource/cicd";
}

export class Retry {
  public static readonly RETRY_TIMES = 10;
  public static readonly BACKOFF_TIME_MS = 5000;
}
