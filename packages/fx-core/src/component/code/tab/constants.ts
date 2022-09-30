// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PathConstants } from "../../constants";

export const TabDeployIgnoreFolder = [
  PathConstants.nodeArtifactFolder,
  PathConstants.npmPackageFolder,
  PathConstants.deploymentInfoFolder,
];

export const DefaultValues = {
  authFileName: "auth-start.html",
  dotnetPlatform: "win-x86",
};

export const errorSource = "FE";
