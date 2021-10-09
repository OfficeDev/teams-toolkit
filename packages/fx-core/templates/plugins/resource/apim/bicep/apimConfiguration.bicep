param apimServiceName string
param oauthServerName string
param clientId string
@secure()
param clientSecret string
param m365TenantId string
param m365OauthAuthorityHost string
param oauthAuthorityHost string = 'https://login.microsoftonline.com'

var scope =  '${m365OauthAuthorityHost}/.default'
var authorizationEndpoint = uri(oauthAuthorityHost, '${m365TenantId}/oauth2/v2.0/authorize')
var tokenEndpoint = uri(oauthAuthorityHost, '${m365TenantId}/oauth2/v2.0/token')

resource apimServiceAuthServer 'Microsoft.ApiManagement/service/authorizationServers@2021-01-01-preview' = {
  name: '${apimServiceName}/${oauthServerName}'
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

output authServiceResourceId string = apimServiceAuthServer.id
