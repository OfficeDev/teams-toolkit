export const CONFIGURATION_PREFIX = "fx-extension";
export enum ConfigurationKey {
  BicepEnvCheckerEnable = "prerequisiteCheck.bicep",
  RootDirectory = "defaultProjectRootDirectory",
  AutomaticNpmInstall = "automaticNpmInstall",
  UnifyConfigs = "unifyConfigs",
  EnableInitApp = "enableInitApp",
  BotNotificationCommandAndResponseEnabled = "enableNotification / CommandAndResponseBot",
  YoEnvCheckerEnable = "spfxPrerequisiteCheck.yo",
  generatorEnvCheckerEnable = "spfxPrerequisiteCheck.sharepointYeomanGenerator",
}

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

export enum GlobalKey {
  OpenWalkThrough = "fx-extension.openWalkThrough",
  OpenReadMe = "fx-extension.openReadMe",
  OpenSampleReadMe = "fx-extension.openSampleReadMe",
  ShowLocalDebugMessage = "ShowLocalDebugMessage",
}
