// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentAppSettings object

var webAppName = split(provisionOutputs.simpleAuthOutput.value.webAppResourceId, '/')[8]

var m365ClientId = provisionParameters['m365ClientId']
var m365ClientSecret = provisionParameters['m365ClientSecret']
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var oauthAuthority = uri(m365OauthAuthorityHost, m365TenantId)
var aadMetadataAddress = uri(m365OauthAuthorityHost, '${m365TenantId}/v2.0/.well-known/openid-configuration')
var botId = provisionParameters['botAadAppClientId']
// var tabAppDomain = provisionOutputs.frontendHostingOutput.value.domain
{{#contains 'fx-resource-frontend-hosting' Plugins}}
var tabAppDomain = {{../PluginOutput.fx-resource-frontend-hosting.References.domain}}
var tabAppEndpoint = {{../PluginOutput.fx-resource-frontend-hosting.References.endpoint}} 
{{/contains}}

{{#contains 'fx-resource-frontend-hosting' Plugins}}
{{#notContains 'fx-resource-bot' ../Plugins}}
var m365ApplicationIdUri = 'api://${ {{~../PluginOutput.fx-resource-frontend-hosting.References.domain~}} }/${m365ClientId}'
{{/notContains}}
{{#contains 'fx-resource-bot' ../Plugins}}
var m365ApplicationIdUri = 'api://${ {{~../PluginOutput.fx-resource-frontend-hosting.References.domain~}} }/botid-${bot_aadClientId}'
{{/contains}}
{{/contains}}
{{#notContains 'fx-resource-frontend-hosting' Plugins}}
{{#contains 'fx-resource-bot' ../Plugins}}
var m365ApplicationIdUri = 'api://botid-${bot_aadClientId}'
{{/contains}}
{{/notContains}}

var teamsMobileOrDesktopAppClientId = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'
var teamsWebAppClientId = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'
var authorizedClientApplicationIds = '${teamsMobileOrDesktopAppClientId};${teamsWebAppClientId}'

resource simpleAuthWebAppSettings 'Microsoft.Web/sites/config@2021-01-15' = {
  name: '${webAppName}/appsettings'
  properties: union({
    AAD_METADATA_ADDRESS: aadMetadataAddress
    ALLOWED_APP_IDS: authorizedClientApplicationIds
    IDENTIFIER_URI: m365ApplicationIdUri
    CLIENT_ID: m365ClientId
    CLIENT_SECRET: m365ClientSecret
    OAUTH_AUTHORITY: oauthAuthority
    {{#contains 'fx-resource-frontend-hosting' Plugins}}
    TAB_APP_ENDPOINT: tabAppEndpoint
    {{/contains}}
  }, currentAppSettings)
}
