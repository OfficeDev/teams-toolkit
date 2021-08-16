param functionServerfarmsName string
param functionAppName string
@minLength(3)
@maxLength(24)
@description('Name of Storage Accounts for function backend.')
param functionStorageName string
param aadClientId string
@secure()
param aadClientSecret string
param m365TenantId string
param applicationIdUri string

{{#contains 'fx-resource-frontend-hosting' Plugins}}
param frontendHostingStorageEndpoint string
{{/contains}}
{{#contains 'fx-resource-azure-sql' Plugins}}
param sqlDatabaseName string
param sqlEndpoint string
{{/contains}}
{{#contains 'fx-resource-identity' Plugins}}
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
  }
  sku: {
    name: 'Standard_LRS'
  }
}

var oauthAuthority = uri(oauthAuthorityHost, m365TenantId)

resource functionAppAppSettings 'Microsoft.Web/sites/config@2018-02-01' = {
  parent: functionApp
  name: 'appsettings'
  properties: {
    API_ENDPOINT: 'https://${functionApp.properties.hostNames[0]}'
    ALLOWED_APP_IDS: teamsAadIds
    AzureWebJobsDashboard: 'DefaultEndpointsProtocol=https;AccountName=${functionStorage.name};AccountKey=${listKeys(resourceId(resourceGroup().name, 'Microsoft.Storage/storageAccounts', functionStorage.name), '2019-04-01').keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
    AzureWebJobsStorage: 'DefaultEndpointsProtocol=https;AccountName=${functionStorage.name};AccountKey=${listKeys(resourceId(resourceGroup().name, 'Microsoft.Storage/storageAccounts', functionStorage.name), '2019-04-01').keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
    FUNCTIONS_EXTENSION_VERSION: '~3'
    FUNCTIONS_WORKER_RUNTIME: 'node'
    {{#contains 'fx-resource-azure-sql' Plugins}}
    IDENTITY_ID: identityId
    {{/contains}}
    M365_APPLICATION_ID_URI: applicationIdUri
    M365_CLIENT_ID: aadClientId
    M365_CLIENT_SECRET: aadClientSecret
    M365_TENANT_ID: m365TenantId
    M365_AUTHORITY_HOST: oauthAuthorityHost
    {{#contains 'fx-resource-azure-sql' Plugins}}
    SQL_DATABASE_NAME: sqlDatabaseName
    SQL_ENDPOINT: sqlEndpoint
    {{/contains}}
    WEBSITE_CONTENTAZUREFILECONNECTIONSTRING: 'DefaultEndpointsProtocol=https;AccountName=${functionStorage.name};AccountKey=${listKeys(resourceId(resourceGroup().name, 'Microsoft.Storage/storageAccounts', functionStorage.name), '2019-04-01').keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
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
    clientId: aadClientId
    issuer: '${oauthAuthority}/v2.0'
    allowedAudiences: [
      aadClientId
      applicationIdUri
    ]
  }
}

output appServicePlanName string = functionServerfarms.name
output functionEndpoint string = functionApp.properties.hostNames[0]
output storageAccountName string = functionStorage.name
output appName string = functionAppName
