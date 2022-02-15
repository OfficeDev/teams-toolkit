@secure()
param provisionParameters object

var resourceBaseName = provisionParameters['resourceBaseName']
var apimServiceName = contains(provisionParameters, 'apimServiceName') ? provisionParameters['apimServiceName'] : '${resourceBaseName}' // Try to read name for APIM Service from parameters
var apimServiceSku = contains(provisionParameters, 'apimServiceSku') ? provisionParameters['apimServiceSku'] : 'Consumption'  // Try to read SKU for APIM Service from parameters
var productName = contains(provisionParameters, 'apimProductName') ? provisionParameters['apimProductName'] : '${resourceBaseName}'  // Try to read name for APIM Product from parameters
var publisherEmail = provisionParameters['apimPublisherEmail']  // Read publisher email for APIM Service from parameters, this parameter is required
var publisherName = provisionParameters['apimPublisherName'] // Read publisher name for APIM Service from parameters, this parameter is required

// APIM Service that helps manage your APIs
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

// Group your APIs, define terms of use and runtime policies
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
