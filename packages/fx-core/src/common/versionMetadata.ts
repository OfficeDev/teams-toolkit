// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const MetadataV3 = {
  vscodeStarterVersion: "5.0.0",
  // TODO: it should be confirmed
  cliStarterVersion: "2.0.0",
  // TODO: it should be confirmed
  vsStarterVersion: "5.0.0",
  projectVersion: "3.0.0",
};

export const MetadataV2 = {
  projectVersion: "2.0.0",
  projectMaxVersion: "2.1.0",
};

export const Metadata = {
  versionMatchLink: "https://aka.ms/teamsfx-project-toolkit-match",
};

export enum VersionState {
  // project version compatible
  compatible = 0,
  // project version outdated
  upgradeable = -1,
  // project version ahead, need update toolkit
  unsupported = 1,
}
