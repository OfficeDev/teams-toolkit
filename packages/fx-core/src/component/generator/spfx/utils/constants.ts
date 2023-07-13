// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getLocalizedString } from "../../../../common/localizeUtils";

// Licensed under the MIT license.
export class Constants {
  public static readonly FRAMEWORK_NONE = "none";
  public static readonly FRAMEWORK_REACT = "react";
  public static readonly MAX_ALIAS_LENGTH = 40;
  public static readonly MAX_BUNDLE_NAME_LENGTH = 64;
  public static readonly CALLED_ID = "teamsdev";
  public static readonly APP_CATALOG_REFRESH_TIME = 20000;
  public static readonly APP_CATALOG_MAX_TIMES = 6;
  public static readonly APP_CATALOG_ACTIVE_TIME = 180000;
  public static readonly PLUGIN_NAME = "SPFx";
  public static readonly PLUGIN_DEV_NAME = "fx-resource-spfx";
  public static readonly BUILD_SHAREPOINT_PACKAGE = "Build SharePoint Package";
  public static readonly READ_MORE = getLocalizedString("core.Notification.ReadMore");
  public static readonly CANCEL = getLocalizedString("core.option.cancel");
  public static readonly DEPLOY_GUIDE =
    "https://docs.microsoft.com/en-us/microsoftteams/platform/get-started/first-app-spfx?tabs=vscode#deploy-your-app-to-sharepoint";
  public static readonly CREATE_APP_CATALOG_GUIDE =
    "https://docs.microsoft.com/en-us/sharepoint/use-app-catalog#create-the-app-catalog";
  public static readonly SPFX_HELP_LINK = "https://aka.ms/teamsfx-spfx-help";
  public static readonly SetUpDevEnvironmentHelpLink =
    "https://aka.ms/teamsfx-spfx-dev-environment-setup";
  public static readonly TEMPLATE_NAME = "spfx-tab";
  public static readonly LatestVersion = "latest";
  public static readonly RecommendedLowestSpfxVersion = "v1.14.0";
  public static readonly GeneratorPackageName = "@microsoft/generator-sharepoint";
  public static readonly YeomanPackageName = "yo";
  public static readonly DEFAULT_WEBPART_NAME = "helloworld";
  public static readonly ScaffoldHelpLink = "https://aka.ms/teamsfx-spfx-help-v5";
  public static readonly DevProgramLink =
    "https://developer.microsoft.com/en-us/microsoft-365/dev-program";
  public static readonly YO_RC_SOLUTION_NAME = "solutionName";
  public static readonly IMPORT_HELP_LINK = "https://aka.ms/teamsfx-spfx-help-v5";
}

export class TelemetryKey {
  static readonly Component = "component";
  static readonly Success = "success";
  static readonly ErrorType = "error-type";
  static readonly ErrorMessage = "error-message";
  static readonly ErrorCode = "error-code";
}

export class TelemetryValue {
  static readonly Success = "yes";
  static readonly Fail = "no";
  static readonly UserError = "user";
  static readonly SystemError = "system";
}

export class ProgressTitleMessage {
  static readonly PreDeployProgressTitle = getLocalizedString(
    "plugins.spfx.buildSharepointPackage"
  );
  static readonly DeployProgressTitle = getLocalizedString("plugins.spfx.deploy.title");
  static readonly ScaffoldProgressTitle = getLocalizedString("plugins.spfx.scaffold.title");
  static readonly AddProgressTitle = getLocalizedString("driver.spfx.add.progress.title");
}

export class ScaffoldProgressMessage {
  static readonly DependencyCheck = getLocalizedString("plugins.spfx.scaffold.dependencyCheck");
  static readonly DependencyInstall = getLocalizedString("plugins.spfx.scaffold.dependencyInstall");
  static readonly ScaffoldProject = getLocalizedString("plugins.spfx.scaffold.scaffoldProject");
  static readonly UpdateManifest = getLocalizedString("plugins.spfx.scaffold.updateManifest");
}

export class ManifestTemplate {
  static readonly LOCAL_CONTENT_URL =
    "https://{teamSiteDomain}/_layouts/15/TeamsLogon.aspx?SPFX=true&dest={teamSitePath}/_layouts/15/TeamsWorkBench.aspx%3FcomponentId=%s%26teams%26personal%26forceLocale={locale}%26loadSPFX%3Dtrue%26debugManifestsFile%3Dhttps%3A%2F%2Flocalhost%3A4321%2Ftemp%2Fmanifests.js";
  static readonly LOCAL_CONFIGURATION_URL =
    "https://{teamSiteDomain}{teamSitePath}/_layouts/15/TeamsLogon.aspx?SPFX=true&dest={teamSitePath}/_layouts/15/TeamsWorkBench.aspx%3FcomponentId=%s%26openPropertyPane=true%26teams%26forceLocale={locale}%26loadSPFX%3Dtrue%26debugManifestsFile%3Dhttps%3A%2F%2Flocalhost%3A4321%2Ftemp%2Fmanifests.js";
  static readonly REMOTE_CONTENT_URL =
    "https://{teamSiteDomain}/_layouts/15/TeamsLogon.aspx?SPFX=true&dest=/_layouts/15/teamshostedapp.aspx%3Fteams%26personal%26componentId=%s%26forceLocale={locale}";
  static readonly REMOTE_CONFIGURATION_URL =
    "{{^config.isLocalDebug}}https://{teamSiteDomain}{teamSitePath}/_layouts/15/TeamsLogon.aspx?SPFX=true&dest={teamSitePath}/_layouts/15/teamshostedapp.aspx%3FopenPropertyPane=true%26teams%26componentId=%s%26forceLocale={locale}{{/config.isLocalDebug}}{{#config.isLocalDebug}}https://{teamSiteDomain}{teamSitePath}/_layouts/15/TeamsLogon.aspx?SPFX=true&dest={teamSitePath}/_layouts/15/TeamsWorkBench.aspx%3FcomponentId=%s%26openPropertyPane=true%26teams%26forceLocale={locale}%26loadSPFX%3Dtrue%26debugManifestsFile%3Dhttps%3A%2F%2Flocalhost%3A4321%2Ftemp%2Fmanifests.js{{/config.isLocalDebug}}";
  static readonly WEBSITE_URL = "https://products.office.com/en-us/sharepoint/collaboration";
  static readonly WEB_APP_INFO_RESOURCE = "https://{teamSiteDomain}";
  static readonly WEB_APP_INFO_ID = "00000003-0000-0ff1-ce00-000000000000";
}
