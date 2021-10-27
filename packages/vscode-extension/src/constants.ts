export const CONFIGURATION_PREFIX = "fx-extension";
export enum ConfigurationKey {
  BicepEnvCheckerEnable = "validateBicep",
  InsiderPreview = "insiderPreview",
  RootDirectory = "defaultProjectRootDirectory",
}

export const migrateV1DocUrl = "https://aka.ms/teamsfx-migrate-v1";

export enum SyncedState {
  Version = "teamsToolkit:synced:version",
}

export enum UserState {
  IsExisting = "teamsToolkit:user:isExisting",
}
