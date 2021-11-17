@secure()
param provisionParameters object
var resourceBaseName = provisionParameters.resourceBaseName
var storageName = contains(provisionParameters, 'frontendHostingStorageName') ? provisionParameters['frontendHostingStorageName'] : '${resourceBaseName}tab'

resource storage 'Microsoft.Storage/storageAccounts@2021-06-01' = {
  kind: 'StorageV2'
  location: resourceGroup().location
  name: storageName
  properties: {
    supportsHttpsTrafficOnly: true
  }
  sku: {
    name: 'Standard_LRS'
  }
}

var siteDomain = replace(replace(storage.properties.primaryEndpoints.web, 'https://', ''), '/', '')

output resourceId string = storage.id
output endpoint string = 'https://${siteDomain}'
output domain string = siteDomain
