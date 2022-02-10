import { AzureResource } from "./resourceStates";

export interface AzureIdentity extends AzureResource {
  identityName: string;
  identityResourceId: string;
  identityClientId: string;
}

export interface FrontendHostingResource extends AzureResource {
  domain: string;
  endpoint: string;
  storageResourceId: string;
}

export interface AzureSQL extends AzureResource {
  admin: string;
  sqlResourceId: string;
  sqlEndpoint: string;
  databaseName: string;
}

export interface AzureBot extends AzureResource {
  botId: string;
  objectId: string;
  skuName: string;
  siteName: string;
  validDomain: string;
  appServicePlanName: string;
  botWebAppResourceId: string;
  siteEndpoint: string;
  botPassword: string;
  secretFields: "botPassword"[];
}

export interface AADApp extends AzureResource {
  clientId: string;
  objectId: string;
  oauth2PermissionScopeId: string;
  tenantId: string;
  oauthHost: string;
  oauthAuthority: string;
  applicationIdUris: string;
  clientSecret: string;
  secretFields: "clientSecret"[];
}

export interface AzureFunction extends AzureResource {
  functionAppResourceId: string;
  functionEndpoint: string;
}

export interface APIM extends AzureResource {
  apimClientAADObjectId: string;
  apimClientAADClientId: string;
  serviceResourceId: string;
  productResourceId: string;
  authServerResourceId: string;
  apimClientAADClientSecret: string;
  secretFields: "apimClientAADClientSecret"[];
}

export interface SimpleAuth extends AzureResource {
  endpoint: string;
  webAppResourceId: string;
}
