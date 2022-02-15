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

{{#if (contains "fx-resource-bot" plugins) }}
var botId = provisionParameters['botAadAppClientId']
{{/if}}

{{#if (contains "fx-resource-frontend-hosting" plugins) }}
var tabAppDomain = \{{fx-resource-frontend-hosting.References.domain}}
{{/if}}

{{#if (contains "fx-resource-frontend-hosting" plugins) }}
  {{#if (contains "fx-resource-bot" plugins)}}
var m365ApplicationIdUri = 'api://${tabAppDomain}/botid-${botId}'
  {{else}}
var m365ClientId = provisionParameters['m365ClientId']
var m365ApplicationIdUri = 'api://${tabAppDomain}/${m365ClientId}'
  {{/if}}
{{else}}
  {{#if (contains "fx-resource-bot" plugins) }}
var m365ApplicationIdUri = 'api://botid-${botId}'
  {{/if}}
{{/if}}

var scope = '${m365ApplicationIdUri}/.default'
var authorizationEndpoint = uri(m365OauthAuthorityHost, '${m365TenantId}/oauth2/v2.0/authorize')
var tokenEndpoint = uri(m365OauthAuthorityHost, '${m365TenantId}/oauth2/v2.0/token')

//Enables Microsoft Power Platform to access your APIs hosted in Function App
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
