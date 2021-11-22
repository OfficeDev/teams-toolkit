@secure()
param provisionParameters object

var resourceBaseName = provisionParameters['resourceBaseName']
var apimServiceName = contains(provisionParameters, 'apimServiceName') ? provisionParameters['apimServiceName'] : '${resourceBaseName}'
var apimServiceSku = contains(provisionParameters, 'apimServiceSku') ? provisionParameters['apimServiceSku'] : 'Consumption'
var productName = contains(provisionParameters, 'apimProductName') ? provisionParameters['apimProductName'] : '${resourceBaseName}'
var publisherEmail = provisionParameters['apimPublisherEmail']
var publisherName = provisionParameters['apimPublisherName']

resource apimService 'Microsoft.ApiManagement/service@2020-12-01' = {
  name: apimServiceName
  location: resourceGroup().location
  sku: {
    name: apimServiceSku // You can follow https://aka.ms/teamsfx-bicep-add-param-tutorial to add apimServiceSku property to provisionParameters to override the default value "Consumption".
    capacity: 0
  }
  properties: {
    publisherEmail: publisherEmail
    publisherName: publisherName
  }
}

resource apimServiceProduct 'Microsoft.ApiManagement/service/products@2020-12-01' = {
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
