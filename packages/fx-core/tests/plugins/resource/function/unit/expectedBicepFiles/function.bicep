param functionServerfarmsName string
param functionAppName string
param functionStorageName string
param m365ClientId string
@secure()
param m365ClientSecret string
param m365TenantId string
param m365ApplicationIdUri string
param m365OauthAuthorityHost string

param frontendHostingStorageEndpoint string

var teamsMobileOrDesktopAppClientId = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'
var teamsWebAppClientId = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'
var authorizedClientApplicationIds = '${teamsMobileOrDesktopAppClientId};${teamsWebAppClientId}'

resource functionServerfarms 'Microsoft.Web/serverfarms@2020-06-01' = {
  name: functionServerfarmsName
  kind: 'functionapp'
  location: resourceGroup().location
  sku: {
    name: 'Y1'
  }
}

resource functionApp 'Microsoft.Web/sites@2020-06-01' = {
  name: functionAppName
  kind: 'functionapp'
  location: resourceGroup().location
  properties: {
    reserved: false
    serverFarmId: functionServerfarms.id
    siteConfig: {
      cors: {
        allowedOrigins: [
          frontendHostingStorageEndpoint
        ]
      }
      numberOfWorkers: 1
    }
  }
}

resource functionStorage 'Microsoft.Storage/storageAccounts@2021-04-01' = {
  name: functionStorageName
  kind: 'StorageV2'
  location: resourceGroup().location
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
  }
  sku: {
    name: 'Standard_LRS'
  }
}

var oauthAuthority = uri(m365OauthAuthorityHost, m365TenantId)

resource functionAppAppSettings 'Microsoft.Web/sites/config@2018-02-01' = {
  parent: functionApp
  name: 'appsettings'
  properties: {
    API_ENDPOINT: 'https://${functionApp.properties.hostNames[0]}'
    ALLOWED_APP_IDS: authorizedClientApplicationIds
    AzureWebJobsDashboard: 'DefaultEndpointsProtocol=https;AccountName=${functionStorage.name};AccountKey=${listKeys(functionStorage.id, functionStorage.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
    AzureWebJobsStorage: 'DefaultEndpointsProtocol=https;AccountName=${functionStorage.name};AccountKey=${listKeys(functionStorage.id, functionStorage.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
    FUNCTIONS_EXTENSION_VERSION: '~3'
    FUNCTIONS_WORKER_RUNTIME: 'node'
    M365_APPLICATION_ID_URI: m365ApplicationIdUri
    M365_CLIENT_ID: m365ClientId
    M365_CLIENT_SECRET: m365ClientSecret
    M365_TENANT_ID: m365TenantId
    M365_AUTHORITY_HOST: m365OauthAuthorityHost
    WEBSITE_CONTENTAZUREFILECONNECTIONSTRING: 'DefaultEndpointsProtocol=https;AccountName=${functionStorage.name};AccountKey=${listKeys(functionStorage.id, functionStorage.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
    WEBSITE_RUN_FROM_PACKAGE: '1'
    WEBSITE_CONTENTSHARE: toLower(functionAppName)
  }
}

resource functionAppAuthSettings 'Microsoft.Web/sites/config@2018-02-01' = {
  parent: functionApp
  name: 'authsettings'
  properties: {
    enabled: true
    defaultProvider: 'AzureActiveDirectory'
    clientId: m365ClientId
    issuer: '${oauthAuthority}/v2.0'
    allowedAudiences: [
      m365ClientId
      m365ApplicationIdUri
    ]
  }
}

output appServicePlanName string = functionServerfarms.name
output functionEndpoint string = functionApp.properties.hostNames[0]
output storageAccountName string = functionStorage.name
output appName string = functionAppName
