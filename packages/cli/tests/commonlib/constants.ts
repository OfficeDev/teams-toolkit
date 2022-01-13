export class TestFilePath {
  static readonly armTemplateBaseFolder = "./templates/azure";
  static readonly configFolder = "./.fx/configs";

  static readonly projectSettingsFileName = "projectSettings.json";

  static readonly mainFileName = "main.bicep";
  static readonly provisionFileName = "provision.bicep";
  static readonly configFileName = "config.bicep";

  static readonly provisionFolder = "provision";
}

export class PluginId {
  static readonly Solution = "solution";
  static readonly Aad = "fx-resource-aad-app-for-teams";
  static readonly FrontendHosting = "fx-resource-frontend-hosting";
  static readonly SimpleAuth = "fx-resource-simple-auth";
  static readonly Bot = "fx-resource-bot";
  static readonly LocalDebug = "fx-resource-local-debug";
  static readonly AzureSQL = "fx-resource-azure-sql";
  static readonly Function = "fx-resource-function";
  static readonly Identity = "fx-resource-identity";
  static readonly Apim = "fx-resource-apim";
  static readonly KeyVault = "fx-resource-key-vault";
}

export const fileEncoding = "UTF8";

export enum Capability {
  Tab = "tab",
  Bot = "bot",
  MessagingExtension = "messaging-extension",
}

export enum Resource {
  AzureKeyVault = "azure-keyvault",
  AzureFunction = "azure-function",
  AzureApim = "azure-apim",
  AzureSql = "azure-sql",
}

export enum ResourceToDeploy {
  Spfx = "spfx",
  FrontendHosting = "frontend-hosting",
  Bot = "bot",
  Function = "function",
  Apim = "apim",
}
export class StateConfigKey {
  // solution
  static readonly subscriptionId = "subscriptionId";
  static readonly resourceGroupName = "resourceGroupName";

  // aad
  static readonly clientId = "clientId";
  static readonly clientSecret = "clientSecret";
  static readonly oauthAuthority = "oauthAuthority";

  // simple auth
  static readonly endpoint = "endpoint";
  static readonly webAppResourceId = "webAppResourceId";
  // bot
  static readonly botId = "botId";
  static readonly botPassword = "botPassword";
  // sql
  static readonly skipAddingUser = "skipAddingUser";
  static readonly sqlEndpoint: string = "sqlEndpoint";
  static readonly databaseName: string = "databaseName";
  // function
  static readonly functionEndpoint = "functionEndpoint";
  static readonly functionAppResourceId = "functionAppResourceId";
  // frontend hosting
  static readonly domain = "domain";
  // identity
  static readonly identityClientId = "identityClientId";
  // key vault
  static readonly keyVaultResourceId = "keyVaultResourceId";

  static readonly skuName = "skuName";
}
export class ProjectSettingKey {
  static readonly solutionSettings = "solutionSettings";
  static readonly activeResourcePlugins = "activeResourcePlugins";
}

export class provisionParametersKey {
  static readonly resourceBaseName = "resourceBaseName";
  static readonly m365ClientSecretName = "m365ClientSecretName";
  static readonly botClientSecretName = "botClientSecretName";
  static readonly simpleAuthSku = "simpleAuthSku";
}
