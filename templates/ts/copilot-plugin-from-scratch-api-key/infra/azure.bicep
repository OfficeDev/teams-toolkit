@maxLength(20)
@minLength(4)
param resourceBaseName string
param functionAppSKU string
param functionStorageSKU string

param location string = resourceGroup().location
param serverfarmsName string = resourceBaseName
param functionAppName string = resourceBaseName
param functionStorageName string = '${resourceBaseName}api'
@secure()
param apiKey string

// Azure Storage is required when creating Azure Functions instance
resource functionStorage 'Microsoft.Storage/storageAccounts@2021-06-01' = {
  name: functionStorageName
  kind: 'StorageV2'
  location: location
  sku: {
    name: functionStorageSKU// You can follow https://aka.ms/teamsfx-bicep-add-param-tutorial to add functionStorageSKUproperty to provisionParameters to override the default value "Standard_LRS".
  }
}

// Compute resources for Azure Functions
resource serverfarms 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: serverfarmsName
  location: location
  sku: {
    name: functionAppSKU // You can follow https://aka.ms/teamsfx-bicep-add-param-tutorial to add functionServerfarmsSku property to provisionParameters to override the default value "Y1".
  }
  properties: {}
}

// Azure Functions that hosts your function code
resource functionApp 'Microsoft.Web/sites@2021-02-01' = {
  name: functionAppName
  kind: 'functionapp'
  location: location
  properties: {
    serverFarmId: serverfarms.id
    httpsOnly: true
    siteConfig: {
      appSettings: [
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4' // Use Azure Functions runtime v4
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node' // Set runtime to NodeJS
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
          name: 'API_KEY'
          value: apiKey
        }
      ]
      ftpsState: 'FtpsOnly'
    }
  }
}
var apiEndpoint = 'https://${functionApp.properties.defaultHostName}'


// The output will be persisted in .env.{envName}. Visit https://aka.ms/teamsfx-actions/arm-deploy for more details.
output API_FUNCTION_ENDPOINT string = apiEndpoint
output API_FUNCTION_RESOURCE_ID string = functionApp.id
output OPENAPI_SERVER_URL string = apiEndpoint
