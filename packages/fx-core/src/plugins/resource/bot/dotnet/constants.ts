// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";

export class PathInfo {
  public static readonly BicepTemplateRelativeDir = path.join(
    "plugins",
    "resource",
    "botservice",
    "bicep"
  );
  public static readonly ProvisionModuleTemplateFileName = "botServiceProvision.template.bicep";
  static readonly appSettingDevelopment = "appsettings.Development.json";
}

export class RegularExpr {
  static readonly botId = /\$botId\$/g;
  static readonly botPassword = /\$bot-password\$/g;
}
