// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getLocalizedString } from "../../../../../common/localizeUtils";

export class Constants {
  public static readonly APP_CATALOG_REFRESH_TIME = 20000;
  public static readonly APP_CATALOG_MAX_TIMES = 6;
  public static readonly APP_CATALOG_ACTIVE_TIME = 180000;
  public static readonly DeployDriverName = "spfx/deploy";
  public static readonly TelemetryComponentName = "fx-resource-spfx";
  public static readonly TelemetryDeployEventName = "deploy";
  public static readonly DeployProgressTitle = () =>
    getLocalizedString("plugins.spfx.deploy.title");
  public static readonly DevProgramLink =
    "https://developer.microsoft.com/en-us/microsoft-365/dev-program";
}

export class DeployProgressMessage {
  static readonly SkipCreateSPAppCatalog = () =>
    getLocalizedString("driver.spfx.deploy.skipCreateAppCatalog");
  static readonly CreateSPAppCatalog = () =>
    getLocalizedString("driver.spfx.deploy.createAppCatalog");
  static readonly Upload = () => getLocalizedString("driver.spfx.deploy.uploadPackage");
  static readonly Deploy = () => getLocalizedString("driver.spfx.deploy.deployPackage");
}
