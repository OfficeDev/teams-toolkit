@secure()
param provisionParameters object
var resourceBaseName = provisionParameters.resourceBaseName
var storageName = contains(provisionParameters, 'frontendHostingStorageName') ? provisionParameters['frontendHostingStorageName'] : '${resourceBaseName}{{scenarioInLowerCase}}' // Try to read name for frontend hosting Storage Account from parameters
var storageSku = contains(provisionParameters, 'frontendHostingStorageSku') ? provisionParameters['frontendHostingStorageSku'] : 'Standard_LRS' // Try to read SKU for frontend hosting Storage Account from parameters

// Azure Storage that hosts your static web site
resource storage 'Microsoft.Storage/storageAccounts@2021-06-01' = {
  kind: 'StorageV2'
  location: resourceGroup().location
  name: storageName
  properties: {
    supportsHttpsTrafficOnly: true
  }
  sku: {
    name: storageSku // You can follow https://aka.ms/teamsfx-bicep-add-param-tutorial to add frontendHostingStorageSku property to provisionParameters to override the default value "Standard_LRS".
  }
}

var siteDomain = replace(replace(storage.properties.primaryEndpoints.web, 'https://', ''), '/', '')

output storageResourceId string = storage.id
output endpoint string = 'https://${siteDomain}'
output domain string = siteDomain
output indexPath string = '/index.html#'
