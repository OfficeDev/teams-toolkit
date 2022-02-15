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
}
