export const CONFIGURATION_PREFIX = "fx-extension";
export enum ConfigurationKey {
  BicepEnvCheckerEnable = "prerequisiteCheck.bicep",
  RootDirectory = "defaultProjectRootDirectory",
  AutomaticNpmInstall = "automaticNpmInstall",
  EnableExistingApp = "enableExistingApp",
  BotNotificationCommandAndResponseEnabled = "enableNotification / CommandAndResponseBot",
  YoEnvCheckerEnable = "SPFxPrerequisiteCheck.yo",
  generatorEnvCheckerEnable = "SPFxPrerequisiteCheck.sharepointYeomanGenerator",
  enableM365App = "enableM365App",
  EnableGAPreviewFeatures = "enableGAPreviewFeatures",
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
  ShowLocalPreviewMessage = "ShowLocalPreviewMessage",
}

export enum AadManifestDeployConstants {
  DEPLOY_AAD_FROM_CODELENS = "deploy-aad-from-codelens",
  INCLUDE_AAD_MANIFEST = "include-aad-manifest",
}

export const manifestConfigDataRegex = /{{config.manifest[\.a-zA-Z]+}}/g;
export const manifestStateDataRegex = /{{state\.[a-zA-Z-_]+\.\w+}}/g;
