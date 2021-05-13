// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export class Constants {
  public static readonly FRAMEWORK_NONE = "none";
  public static readonly FRAMEWORK_REACT = "react";
  public static readonly MAX_ALIAS_LENGTH = 40;
  public static readonly MAX_BUNDLE_NAME_LENGTH = 64;
  public static readonly CALLED_ID = "teamsdev";
  public static readonly APP_CATALOG_REFRESH_TIME = 2000;
  public static readonly APP_CATALOG_MAX_TIMES = 30;
  public static readonly PLUGIN_NAME = "SPFx";
  public static readonly PLUGIN_DEV_NAME = "fx-resource-spfx";
  public static readonly BUILD_SHAREPOINT_PACKAGE = "Build SharePoint Package";
  public static readonly READ_MORE = "Read more";
  public static readonly CANCEL = "Cancel";
  public static readonly DEPLOY_GUIDE =
    "https://docs.microsoft.com/en-us/sharepoint/dev/spfx/web-parts/get-started/using-web-part-as-ms-teams-tab#package-and-deploy-your-web-part-to-sharepoint";
}

export class PlaceHolders {
  public static readonly componentName = "<%= componentName %>";
  public static readonly componentNameCamelCase = "<%= componentNameCamelCase %>";
  public static readonly componentClassName = "<%= componentClassName %>";
  public static readonly componentStrings = "<%= componentStrings %>";
  public static readonly libraryName = "<%= libraryName %>";
  public static readonly componentId = "<%= componentId %>";
  public static readonly componentAlias = "<%= componentAlias %>";
  public static readonly componentDescription = "<%= componentDescription %>";
  public static readonly componentNameUnescaped = "<%= componentNameUnescaped %>";
  public static readonly componentClassNameKebabCase = "<%= componentClassNameKebabCase %>";
}

export class TelemetryKey {
  static readonly Component = "component";
  static readonly Success = "success";
  static readonly ErrorType = "error-type";
  static readonly ErrorMessage = "error-message";
}

export class TelemetryValue {
  static readonly Success = "yes";
  static readonly Fail = "no";
  static readonly UserError = "user";
  static readonly SystemError = "system";
}

export class TelemetryEvent {
  static readonly StartSuffix = "-start";
  static readonly Scaffold = "scaffold";
  static readonly PreDeploy = "pre-deploy";
  static readonly Deploy = "deploy";
}

export class ProgressTitleMessage {
  static readonly PreDeployProgressTitle = "Building SharePoint package";
  static readonly DeployProgressTitle = `[${Constants.PLUGIN_NAME}] Deploy SharePoint Package`;
}

export class PreDeployProgressMessage {
  static readonly NpmInstall = "Run: npm install. This may take more than 5 minutes to finish";
  static readonly GulpBundle = "Run: gulp bundle --ship";
  static readonly GulpPackage = "Run: gulp package-solution --ship";
}

export class DeployProgressMessage {
  static readonly GetSPAppCatalog = "Get SharePoint app catalog";
  static readonly UploadAndDeploy = "Upload and deploy SPFx package on your tenant website";
}
