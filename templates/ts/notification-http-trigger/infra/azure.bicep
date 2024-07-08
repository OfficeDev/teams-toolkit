@maxLength(20)
@minLength(4)
@description('Used to generate names for all resources in this file')
param resourceBaseName string

param functionAppSKU string
param storageSKU string

@maxLength(42)
param botDisplayName string

param serverfarmsName string = resourceBaseName
param functionAppName string = resourceBaseName
param identityName string = resourceBaseName
param location string = resourceGroup().location
param storageName string = resourceBaseName

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  location: location
  name: identityName
}

// Compute resources for your Web App
resource serverfarm 'Microsoft.Web/serverfarms@2021-02-01' = {
  kind: 'functionapp'
  location: location
  name: serverfarmsName
  sku: {
    name: functionAppSKU
  }
  properties: {}
}

resource storage 'Microsoft.Storage/storageAccounts@2021-06-01' = {
  name: storageName
  kind: 'StorageV2'
  location: location
  sku: {
    name: storageSKU // You can follow https://aka.ms/teamsfx-bicep-add-param-tutorial to add functionStorageSku property to provisionParameters to override the default value "Standard_LRS".
  }
}

// Azure Function that host your app
resource functionApp 'Microsoft.Web/sites@2021-02-01' = {
  kind: 'functionapp'
  location: location
  name: functionAppName
  properties: {
    serverFarmId: serverfarm.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
      appSettings: [
        {
          name: 'AzureWebJobsDashboard'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${listKeys(storage.id, storage.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}' // Azure Functions internal setting
        }
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${listKeys(storage.id, storage.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}' // Azure Functions internal setting
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4' // Use Azure Functions runtime v4
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node' // Set runtime to NodeJS
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${listKeys(storage.id, storage.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}' // Azure Functions internal setting
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1' // Run Azure Functions from a package file
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18' // Set NodeJS version to 18.x
        }
        {
          name: 'BOT_ID'
          value: identity.properties.clientId
        }
        {
          name: 'BOT_TENANT_ID'
          value: identity.properties.tenantId
        }
        {
          name: 'BOT_TYPE'
          value: 'UserAssignedMsi'
        }
        {
          name: 'RUNNING_ON_AZURE'
          value: '1'
        }
        {
          name: 'SCM_ZIPDEPLOY_DONOT_PRESERVE_FILETIME'
          value: '1' // Zipdeploy files will always be updated. Detail: https://aka.ms/teamsfx-zipdeploy-donot-preserve-filetime
        }
      ]
      ftpsState: 'FtpsOnly'
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
}

// Register your web service as a bot with the Bot Framework
module azureBotRegistration './botRegistration/azurebot.bicep' = {
  name: 'Azure-Bot-registration'
  params: {
    resourceBaseName: resourceBaseName
    identityClientId: identity.properties.clientId
    identityResourceId: identity.id
    identityTenantId: identity.properties.tenantId
    botAppDomain: functionApp.properties.defaultHostName
    botDisplayName: botDisplayName
  }
}

output BOT_DOMAIN string = functionApp.properties.defaultHostName
output BOT_AZURE_FUNCTION_APP_RESOURCE_ID string = functionApp.id
output BOT_FUNCTION_ENDPOINT string = 'https://${functionApp.properties.defaultHostName}'
output BOT_ID string = identity.properties.clientId
output BOT_TENANT_ID string = identity.properties.tenantId
