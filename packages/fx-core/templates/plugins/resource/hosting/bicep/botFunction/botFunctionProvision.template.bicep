@secure()
param provisionParameters object
param userAssignedIdentityId string

var resourceBaseName = provisionParameters.resourceBaseName
var serverfarmsName = contains(provisionParameters, 'botServerfarmsName') ? provisionParameters['botServerfarmsName'] : '${resourceBaseName}bot' // Try to read name for App Service Plan from parameters
var functionSKU = contains(provisionParameters, 'botFunctionAppSKU') ? provisionParameters['botFunctionAppSKU'] : 'B1' // Try to read SKU for Azure Web App from parameters
var functionAppName = contains(provisionParameters, 'botSitesName') ? provisionParameters['botSitesName'] : '${resourceBaseName}bot' // Try to read name for Azure Web App from parameters
var storageName = contains(provisionParameters, 'botStorageName') ? provisionParameters['botStorageName'] : '${resourceBaseName}bot' // Try to read name for Azure Storage from parameters
var storageSku = contains(provisionParameters, 'botStorageSku') ? provisionParameters['botStorageSku'] : 'Standard_LRS' // Try to read SKU for Azure Storage from parameters

// Compute resources for your Function App
resource serverfarm 'Microsoft.Web/serverfarms@2021-02-01' = {
  kind: 'functionapp'
  location: resourceGroup().location
  name: serverfarmsName
  sku: {
    name: functionSKU
  }
}

// Azure Storage is required when creating Azure Functions instance
resource storage 'Microsoft.Storage/storageAccounts@2021-06-01' = {
  name: storageName
  kind: 'StorageV2'
  location: resourceGroup().location
  sku: {
    name: storageSku // You can follow https://aka.ms/teamsfx-bicep-add-param-tutorial to add functionStorageSku property to provisionParameters to override the default value "Standard_LRS".
  }
}

// Function App that hosts your bot
resource functionApp 'Microsoft.Web/sites@2021-02-01' = {
  kind: 'functionapp'
  location: resourceGroup().location
  name: functionAppName
  properties: {
    serverFarmId: serverfarm.id
    keyVaultReferenceIdentity: userAssignedIdentityId // Use given user assigned identity to access Key Vault
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
        {{#if (contains "node" configs)}}
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~16' // Set NodeJS version to 16.x
        }
        {{/if}}
        {{#if (contains "running-on-azure" configs)}}
        {
          name: 'RUNNING_ON_AZURE'
          value: '1'
        }
        {
          name: 'SCM_ZIPDEPLOY_DONOT_PRESERVE_FILETIME'
          value: '1' // Zipdeploy files will always be updated. Detail: https://aka.ms/teamsfx-zipdeploy-donot-preserve-filetime
        }
        {{/if}}
      ]
      ftpsState: 'FtpsOnly'
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {} // The identity is used to access other Azure resources
    }
  }
}

output functionSKU string = functionSKU
output functionName string = functionAppName
output domain string = functionApp.properties.defaultHostName
output appServicePlanName string = serverfarmsName
output functionResourceId string = functionApp.id
output functionEndpoint string = 'https://${functionApp.properties.defaultHostName}'
