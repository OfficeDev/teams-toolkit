// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class LifecycleFuncNames {
  public static readonly ADD_CICD_WORKFLOWS = "add-cicd-workflows";
}

export class ErrorNames {
  public static readonly INTERNAL_ERROR = "InternalError";
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

export class Messages {
  public static readonly PreScaffoldingCICD = "Pre-scaffolding CICD workflows' files.";
  public static readonly ScaffoldingCICD = "Scaffolding CICD workflows' files.";
  public static readonly SuccessfullyScaffoldedCICD =
    "Successfully scaffolded CICD workflows' files.";
  public static readonly FailToReadWritePackageJson =
    "Fail to read/write the project package.json file.";
}

export class PluginSolution {
  public static readonly PLUGIN_NAME = "solution";
  public static readonly REMOTE_TEAMS_APPID = "remoteTeamsAppId";
}

export class PluginCICD {
  public static readonly PLUGIN_NAME = "fx-resource-cicd";
  public static readonly AZDO_CI_YML = "azure-pipeline-ci.yml";
  public static readonly AZDO_CD_YML = "azure-pipeline-cd.yml";
  public static readonly AZDO_PIPELINE_FOLDER = "azdo-pipelines";
  public static readonly GITHUB_WORKFLOW_FOLDER = "github-workflows";
  public static readonly GITHUB_CI_YML = "ci.yml";
  public static readonly GITHUB_CD_YML = "cd.yml";
  public static readonly TEAMSFX_CLI_VERSION = "^0.3.1";
}

export class Suggestions {
  public static readonly RETRY_THE_CURRENT_STEP = "Please retry the current step.";
}

export class FileNames {
  public static readonly PACKAGE_JSON = "package.json";
}
