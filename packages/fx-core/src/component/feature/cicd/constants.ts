// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getLocalizedString } from "../../../common/localizeUtils";

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
  public static readonly RETRY_THE_CURRENT_STEP = () =>
    getLocalizedString("suggestions.retryTheCurrentStep");
  public static readonly CREATE_PROJECT_OR_OPEN_EXISTING = () =>
    getLocalizedString("plugins.cicd.suggestions.createProjectOrOpenExisting");
  public static readonly CHECK_PERMISSION = () =>
    getLocalizedString("plugins.cicd.suggestions.checkPermission");
}
