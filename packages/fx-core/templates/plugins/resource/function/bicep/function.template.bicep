param functionServerfarmsName string
param functionAppName string
param functionNodeVersion string
@minLength(3)
@maxLength(24)
@description('Name of Storage Accounts for function backend.')
param functionStorageName string
param AADClientId string
@secure()
param AADClientSecret string
param tenantId string
param applicationIdUri string

{{#contains 'frontend_hosting' pluginTypes}}
param frontendHostingStorageEndpoint string
{{/contains}}
{{#contains 'azure_sql' pluginTypes}}
param sqlDatabaseName string
param sqlEndpoint string
{{/contains}}
{{#contains 'identity' pluginTypes}}
param identityId string
{{/contains}}

var oauthAuthorityHost = environment().authentication.loginEndpoint
var teamsAadIds = '1fec8e78-bce4-4aaf-ab1b-5451cc387264;5e3ce6c0-2b1f-4285-8d4b-75ee78787346'

resource functionServerfarms 'Microsoft.Web/serverfarms@2020-06-01' = {
  name: functionServerfarmsName
  location: resourceGroup().location
  sku: {
    name: 'Y1'
  }
  kind: 'functionapp'
  properties: {
    reserved: false
  }
}

resource functionApp 'Microsoft.Web/sites@2020-06-01' = {
  kind: 'functionapp'
  name: functionAppName
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
      alwaysOn: false
      http20Enabled: false
      numberOfWorkers: 1
    }
  }
}

resource functionStorage 'Microsoft.Storage/storageAccounts@2021-04-01' = {
  kind: 'StorageV2'
  location: resourceGroup().location
  name: functionStorageName
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    isHnsEnabled: true
  }
  sku: {
    name: 'Standard_LRS'
  }
}

var oauthAuthority = uri(oauthAuthorityHost, tenantId)

resource functionAppAppSettings 'Microsoft.Web/sites/config@2018-02-01' = {
  parent: functionApp
  name: 'appsettings'
  properties: {
    API_ENDPOINT: functionApp.properties.hostNames[0]
    ALLOWED_APP_IDS: teamsAadIds
    AzureWebJobsDashboard: 'DefaultEndpointsProtocol=https;AccountName=${functionStorage.name};AccountKey=${listKeys(resourceId(resourceGroup().name, 'Microsoft.Storage/storageAccounts', functionStorage.name), '2019-04-01').keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
    AzureWebJobsStorage: 'DefaultEndpointsProtocol=https;AccountName=${functionStorage.name};AccountKey=${listKeys(resourceId(resourceGroup().name, 'Microsoft.Storage/storageAccounts', functionStorage.name), '2019-04-01').keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
    FUNCTIONS_EXTENSION_VERSION: '~3'
    FUNCTIONS_WORKER_RUNTIME: 'node'
    {{#contains 'identity' pluginTypes}}
    IDENTITY_ID: identityId
    {{/contains}}
    M365_APPLICATION_ID_URI: applicationIdUri
    M365_CLIENT_ID: AADClientId
    M365_CLIENT_SECRET: AADClientSecret
    M365_TENANT_ID: tenantId
    M365_AUTHORITY_HOST: oauthAuthorityHost
    {{#contains 'azure_sql' pluginTypes}}
    SQL_DATABASE_NAME: sqlDatabaseName
    SQL_ENDPOINT: sqlEndpoint
    {{/contains}}
    WEBSITE_CONTENTAZUREFILECONNECTIONSTRING: 'DefaultEndpointsProtocol=https;AccountName=${functionStorage.name};AccountKey=${listKeys(resourceId(resourceGroup().name, 'Microsoft.Storage/storageAccounts', functionStorage.name), '2019-04-01').keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
    WEBSITE_NODE_DEFAULT_VERSION: functionNodeVersion
    WEBSITE_RUN_FROM_PACKAGE: '1'
    WEBSITE_CONTENTSHARE: toLower(functionAppName)
  }
  dependsOn: [
    functionStorage
  ]
}

resource functionAppAuthSettings 'Microsoft.Web/sites/config@2018-02-01' = {
  parent: functionApp
  name: 'authsettings'
  properties: {
    enabled: true
    defaultProvider: 'AzureActiveDirectory'
    clientId: AADClientId
    issuer: '${oauthAuthority}/v2.0'
    allowedAudiences: [
      AADClientId
      applicationIdUri
    ]
  }
}

output appServicePlanName string = functionServerfarms.name
output functionEndpoint string = functionApp.properties.hostNames[0]
output storageAccountName string = functionStorage.name
