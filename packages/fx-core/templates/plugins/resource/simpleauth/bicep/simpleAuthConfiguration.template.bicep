// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentAppSettings object

var webAppName = split(provisionOutputs.simpleAuthOutput.value.webAppResourceId, '/')[8]

var m365ClientId = provisionParameters['m365ClientId']
{{#contains 'fx-resource-key-vault' Plugins}}
var m365ClientSecret = {{../PluginOutput.fx-resource-key-vault.References.m365ClientSecretReference}}
{{/contains}}
{{#notContains 'fx-resource-key-vault' Plugins}}
var m365ClientSecret = provisionParameters['m365ClientSecret']
{{/notContains}}
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var oauthAuthority = uri(m365OauthAuthorityHost, m365TenantId)
var aadMetadataAddress = uri(m365OauthAuthorityHost, '${m365TenantId}/v2.0/.well-known/openid-configuration')
{{#contains 'fx-resource-bot' Plugins}}
var botId = provisionParameters['botAadAppClientId']
{{/contains}}
{{#contains 'fx-resource-frontend-hosting' Plugins}}
var tabAppDomain = {{../PluginOutput.fx-resource-frontend-hosting.References.domain}}
var tabAppEndpoint = {{../PluginOutput.fx-resource-frontend-hosting.References.endpoint}} 
{{/contains}}
{{#contains 'fx-resource-frontend-hosting' Plugins}}
{{#notContains 'fx-resource-bot' ../Plugins}}
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

var teamsMobileOrDesktopAppClientId = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'
var teamsWebAppClientId = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'
var officeWebAppClientId1 = '4345a7b9-9a63-4910-a426-35363201d503'
var officeWebAppClientId2 = '4765445b-32c6-49b0-83e6-1d93765276ca'
var outlookDesktopAppClientId = 'd3590ed6-52b3-4102-aeff-aad2292ab01c'
var outlookWebAppClientId = '00000002-0000-0ff1-ce00-000000000000'
var authorizedClientApplicationIds = '${teamsMobileOrDesktopAppClientId};${teamsWebAppClientId};${officeWebAppClientId1};${officeWebAppClientId2};${outlookDesktopAppClientId};${outlookWebAppClientId}'

resource simpleAuthWebAppSettings 'Microsoft.Web/sites/config@2021-02-01' = {
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
