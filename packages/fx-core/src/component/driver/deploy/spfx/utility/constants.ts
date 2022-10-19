// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getLocalizedString } from "../../../../../common/localizeUtils";

export class Constants {
  public static readonly APP_CATALOG_REFRESH_TIME = 20000;
  public static readonly APP_CATALOG_MAX_TIMES = 6;
  public static readonly APP_CATALOG_ACTIVE_TIME = 180000;
  public static readonly DeployDriverName = "spfx/deploy";
}

export class ProgressTitleMessage {
  static readonly PreDeployProgressTitle = getLocalizedString(
    "plugins.spfx.buildSharepointPackage"
  );
  static readonly DeployProgressTitle = getLocalizedString("plugins.spfx.deploy.title");
  static readonly ScaffoldProgressTitle = getLocalizedString("plugins.spfx.scaffold.title");
}

export class DeployProgressMessage {
  static readonly CreateSPAppCatalog = getLocalizedString("plugins.spfx.deploy.createAppcatalog");
  static readonly UploadAndDeploy = getLocalizedString("plugins.spfx.deploy.uploadAddDeploy");
}
