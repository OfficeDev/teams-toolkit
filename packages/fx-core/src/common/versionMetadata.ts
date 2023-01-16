// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const MetadataV3 = {
  projectVersion: "1.0.0",
  configFile: "teamsapp.yml",
  localConfigFile: "teamsapp.local.yml",
  defaultEnvironmentFolder: "teamsAppEnv",
  projectId: "projectId",
};

export const MetadataV2 = {
  projectVersion: "2.0.0",
  projectMaxVersion: "2.1.0",
  configFolder: ".fx",
  configFile: "projectSettings.json",
};

export const MetadataV3Abandoned = {
  projectVersion: "3.0.0",
  configFolder: "teamsfx",
  configFile: "settings.json",
};

export const Metadata = {
  versionMatchLink: "https://aka.ms/teamsfx-project-toolkit-match",
};

export enum VersionState {
  // project version compatible
  compatible = 0,
  // project version outdated, project should upgrade
  upgradeable = -1,
  // project version ahead, need update toolkit
  unsupported = 1,
}

export enum VersionSource {
  projectSettings, // for v2 project
  teamsapp, // for v3 project
  unknown,
  settings, // for abandoned v3 project
}
export interface VersionInfo {
  version: string;
  trackingId: string;
  source: string;
}
