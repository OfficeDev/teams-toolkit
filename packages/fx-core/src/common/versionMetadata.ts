// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const MetadataV3 = {
  projectVersion: "1.0.0",
  platformVersion: {
    vs: "17.5.x.x",
    vsc: "5.x.x",
    cli: "2.x.x",
    cli_help: "2.x.x",
  },
  configFile: "teamsapp.yml",
  localConfigFile: "teamsapp.local.yml",
  defaultEnvironmentFolder: "env",
  envFilePrefix: ".env",
  secretFileSuffix: "user",
  projectId: "projectId",
  teamsManifestFileName: "manifest.json",
  aadManifestFileName: "aad.manifest.json",
  v3UpgradeWikiLink: "https://aka.ms/teams-toolkit-5.0-upgrade",
};

export const MetadataV2 = {
  projectVersion: "2.0.0",
  projectMaxVersion: "2.1.0",
  platformVersion: {
    vs: "17.4.x.x",
    vsc: "4.x.x",
    cli: "1.x.x",
    cli_help: "1.x.x",
  },
  configFolder: ".fx",
  stateFolder: "states",
  userdataSuffix: "userdata",
  configFile: "projectSettings.json",
  updateToolkitLink: "https://aka.ms/update-teams-toolkit",
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
  source: VersionSource;
}
