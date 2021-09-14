export const CONFIGURATION_PREFIX = "fx-extension";
export enum ConfigurationKey {
  ArmSupportEnabled = "armSupportEnabled",
  BicepEnvCheckerEnable = "validateBicep",
}

export const migrateV1DocUrl = "https://aka.ms/teamsfx-migrate-v1";

export enum SyncedState {
  Version = "teamsToolkit:synced:version",
}

export enum UserState {
  IsUpgrade = "teamsToolkit:user:isUpgrade",
}
