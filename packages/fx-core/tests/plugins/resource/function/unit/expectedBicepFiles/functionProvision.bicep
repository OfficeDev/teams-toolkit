param functionServerfarmsName string
param functionAppName string
param functionStorageName string

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
    serverFarmId: functionServerfarms.id
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

output functionEndpoint string = functionApp.properties.hostNames[0]
output functionAppResourceId string = functionApp.id
