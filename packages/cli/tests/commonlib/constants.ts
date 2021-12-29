export class TestFilePath {
  static readonly armTemplateBaseFolder = "./templates/azure";
  static readonly configFolder = "./.fx/configs";

  static readonly mainFileName = "main.bicep";
  static readonly provisionFileName = "provision.bicep";
  static readonly configFileName = "config.bicep";

  static readonly provisionFolder = "provision";
}

export class PluginId {
  static readonly Aad = "fx-resource-aad-app-for-teams";
  static readonly FrontendHosting = "fx-resource-frontend-hosting";
  static readonly SimpleAuth = "fx-resource-simple-auth";
  static readonly Bot = "fx-resource-bot";
  static readonly LocalDebug = "fx-resource-local-debug";
  static readonly AzureSQL = "fx-resource-azure-sql";
  static readonly Function = "fx-resource-function";
  static readonly Identity = "fx-resource-identity";
  static readonly Apim = "fx-resource-apim";
}

export const fileEncoding = "UTF8";

export enum Capability {
  Tab = "tab",
  Bot = "bot",
  MessagingExtension = "messaging-extension",
}

export enum Resource {
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
export class ConfigKey {
  static readonly solutionPluginName = "solution";
  static readonly subscriptionId = "subscriptionId";
  static readonly resourceGroupName = "resourceGroupName";

  // simple auth
  static readonly endpoint = "endpoint";
  static readonly webAppResourceId = "webAppResourceId";
  // sql
  static readonly skipAddingUser = "skipAddingUser";

  static readonly skuName = "skuName";
}
