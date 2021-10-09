param apimServiceName string
param productName string
param userId string

resource apimService 'Microsoft.ApiManagement/service@2021-01-01-preview' = {
  name: apimServiceName
  location: resourceGroup().location
  sku: {
    name: 'Consumption'
    capacity: 0
  }
  properties: {
    publisherEmail: userId
    publisherName: userId
  }
}

resource apimServiceProduct 'Microsoft.ApiManagement/service/products@2021-01-01-preview' = {
  parent: apimService
  name: productName
  properties: {
    displayName: productName
    description: 'Created by TeamsFx.'
    subscriptionRequired: false
    state: 'published'
  }
}

output serviceResourceId string = apimService.id
output productResourceId string = apimServiceProduct.id

