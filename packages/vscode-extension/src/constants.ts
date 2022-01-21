export const CONFIGURATION_PREFIX = "fx-extension";
export enum ConfigurationKey {
  BicepEnvCheckerEnable = "validateBicep",
  RootDirectory = "defaultProjectRootDirectory",
  AutomaticNpmInstall = "automaticNpmInstall",
}

export const migrateV1DocUrl = "https://aka.ms/teamsfx-migrate-v1";
export const AzurePortalUrl = "https://portal.azure.com";
export const AzureAssignRoleHelpUrl = "https://aka.ms/teamsfx-azure-role-assignments-help-link";

export const SpfxManageSiteAdminUrl =
  "https://aka.ms/teamsfx-sharepoint-manage-site-admin-help-link";

export enum SyncedState {
  Version = "teamsToolkit:synced:version",
}

export enum UserState {
  IsExisting = "teamsToolkit:user:isExisting",
}
