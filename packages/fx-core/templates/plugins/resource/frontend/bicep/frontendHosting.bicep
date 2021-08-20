param frontend_hosting_storage_name string

var siteDomain = replace(replace(frontendHostingStorage.properties.primaryEndpoints.web, 'https://', ''), '/', '')

resource frontendHostingStorage 'Microsoft.Storage/storageAccounts@2021-04-01' = {
  name: frontend_hosting_storage_name
  kind: 'StorageV2'
  location: resourceGroup().location
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    isHnsEnabled: false
  }
  sku: {
    name: 'Standard_LRS'
  }
}

output storageName string = frontendHostingStorage.name
output endpoint string = 'https://${siteDomain}'
output domain string = siteDomain
