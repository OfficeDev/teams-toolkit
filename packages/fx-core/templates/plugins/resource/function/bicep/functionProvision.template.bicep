@secure()
param provisionParameters object
param userAssignedIdentityId string

var resourceBaseName = provisionParameters.resourceBaseName
var serverfarmsName = contains(provisionParameters, 'functionServerfarmsName') ? provisionParameters['functionServerfarmsName'] : '${resourceBaseName}-function-serverfarms'
var functionAppName = contains(provisionParameters, 'functionWebappName') ? provisionParameters['functionWebappName'] : '${resourceBaseName}-function-webapp'
var storageName = contains(provisionParameters, 'functionStorageName') ? provisionParameters['functionStorageName'] : 'functionstg${uniqueString(resourceBaseName)}'

resource serverfarms 'Microsoft.Web/serverfarms@2021-01-15' = {
  name: serverfarmsName
  kind: 'functionapp'
  location: resourceGroup().location
  sku: {
    name: 'Y1'
  }
}

resource functionApp 'Microsoft.Web/sites@2021-01-15' = {
  name: functionAppName
  kind: 'functionapp'
  location: resourceGroup().location
  properties: {
    serverFarmId: serverfarms.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsDashboard'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${listKeys(storage.id, storage.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${listKeys(storage.id, storage.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~3'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${listKeys(storage.id, storage.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~14'
        }
      ]
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2021-04-01' = {
  name: storageName
  kind: 'StorageV2'
  location: resourceGroup().location
  sku: {
    name: 'Standard_LRS'
  }
}

output functionEndpoint string = functionApp.properties.defaultHostName
output functionAppResourceId string = functionApp.id
