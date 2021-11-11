// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object

var apimServiceName = split(provisionOutputs.apimOutput.value.serviceResourceId, '/')[8]

var resourceBaseName = provisionParameters['resourceBaseName']
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var oauthServerName = contains(provisionParameters, 'apimOauthServerName') ? provisionParameters['apimOauthServerName'] : '${resourceBaseName}'
var clientId = provisionParameters['apimClientId']
var clientSecret = provisionParameters['apimClientSecret']

{{#contains 'fx-resource-bot' Plugins}}
var botId = provisionParameters['botAadAppClientId']
{{/contains}}
{{#contains 'fx-resource-frontend-hosting' Plugins}}
var tabAppDomain = {{../PluginOutput.fx-resource-frontend-hosting.References.domain}}
{{/contains}}
{{#contains 'fx-resource-frontend-hosting' Plugins}}
{{#notContains 'fx-resource-bot' ../Plugins}}
var m365ClientId = provisionParameters['m365ClientId']
var m365ApplicationIdUri = 'api://${tabAppDomain}/${m365ClientId}'
{{/notContains}}
{{#contains 'fx-resource-bot' ../Plugins}}
var m365ApplicationIdUri = 'api://${tabAppDomain}/botid-${botId}'
{{/contains}}
{{/contains}}
{{#notContains 'fx-resource-frontend-hosting' Plugins}}
{{#contains 'fx-resource-bot' ../Plugins}}
var m365ApplicationIdUri = 'api://botid-${botId}'
{{/contains}}
{{/notContains}}

var scope = '${m365ApplicationIdUri}/.default'
var authorizationEndpoint = uri(m365OauthAuthorityHost, '${m365TenantId}/oauth2/v2.0/authorize')
var tokenEndpoint = uri(m365OauthAuthorityHost, '${m365TenantId}/oauth2/v2.0/token')

resource apimServiceAuthServer 'Microsoft.ApiManagement/service/authorizationServers@2020-12-01' = {
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

output authServerResourceId string = apimServiceAuthServer.id
