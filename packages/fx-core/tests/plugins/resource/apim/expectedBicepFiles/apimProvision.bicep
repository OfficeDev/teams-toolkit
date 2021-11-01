param apimServiceName string
param productName string
param publisherEmail string
param publisherName string
param oauthServerName string
param clientId string
@secure()
param clientSecret string
param m365TenantId string
param m365ApplicationIdUri string
param m365OauthAuthorityHost string

var scope = '${m365ApplicationIdUri}/.default'
var authorizationEndpoint = uri(m365OauthAuthorityHost, '${m365TenantId}/oauth2/v2.0/authorize')
var tokenEndpoint = uri(m365OauthAuthorityHost, '${m365TenantId}/oauth2/v2.0/token')


resource apimService 'Microsoft.ApiManagement/service@2020-12-01' = {
  name: apimServiceName
  location: resourceGroup().location
  sku: {
    name: 'Consumption'
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

resource apimServiceAuthServer 'Microsoft.ApiManagement/service/authorizationServers@2020-12-01' = {
  parent: apimService
  name: oauthServerName
  properties: {
    displayName: oauthServerName
    description: 'Created by TeamsFx.'
    clientRegistrationEndpoint: 'http://localhost'
    authorizationEndpoint: authorizationEndpoint
    authorizationMethods: [
      'GET'
      'POST'
    ]
    clientAuthenticationMethod: [
      'Body'
    ]
    tokenEndpoint: tokenEndpoint
    defaultScope: scope
    grantTypes: [
      'authorizationCode'
    ]
    bearerTokenSendingMethods: [
      'authorizationHeader'
    ]
    clientId: clientId
    clientSecret: clientSecret
  }
}

output serviceResourceId string = apimService.id
output productResourceId string = apimServiceProduct.id
output authServerResourceId string = apimServiceAuthServer.id
