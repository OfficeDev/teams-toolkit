export const CONFIGURATION_PREFIX = "fx-extension";
export enum ConfigurationKey {
  BicepEnvCheckerEnable = "validateBicep",
  RootDirectory = "defaultProjectRootDirectory",
}

export const migrateV1DocUrl = "https://aka.ms/teamsfx-migrate-v1";
export const AzurePortalUrl = "https://portal.azure.com";
export const AzureAssignRoleHelpUrl =
  "https://docs.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal";

export const SpfxManageSiteAdminUrl =
  "https://docs.microsoft.com/en-us/sharepoint/manage-site-collection-administrators";

export enum SyncedState {
  Version = "teamsToolkit:synced:version",
}

export enum UserState {
  IsExisting = "teamsToolkit:user:isExisting",
}
