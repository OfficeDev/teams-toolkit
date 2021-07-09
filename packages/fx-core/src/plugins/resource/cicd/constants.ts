// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class LifecycleFuncNames {
  public static readonly PRE_SCAFFOLD = "pre-scaffold";
  public static readonly SCAFFOLD = "scaffold";
}

export class ErrorNames {}

export class Alias {
  public static readonly TEAMS_BOT_PLUGIN = "BT";
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
}
