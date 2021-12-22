// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentAppSettings object

var webAppName = split(provisionOutputs.simpleAuthOutput.value.webAppResourceId, '/')[8]

var m365ClientId = provisionParameters['m365ClientId']
{{#if Plugins.fx-resource-key-vault}}
var m365ClientSecret = {{Plugins.fx-resource-key-vault.References.m365ClientSecretReference}}
{{else}}
var m365ClientSecret = provisionParameters['m365ClientSecret']
{{/if}}
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var oauthAuthority = uri(m365OauthAuthorityHost, m365TenantId)
var aadMetadataAddress = uri(m365OauthAuthorityHost, '${m365TenantId}/v2.0/.well-known/openid-configuration')
{{#if Plugins.fx-resource-bot}}
var botId = provisionParameters['botAadAppClientId']
{{/if}}
{{#with Plugins.fx-resource-frontend-hosting}}
var tabAppDomain = {{References.domain}}
var tabAppEndpoint = {{References.endpoint}} 
{{/with}}

{{#if Plugins.fx-resource-frontend-hosting}}
{{#if Plugins.fx-resource-bot}}
var m365ApplicationIdUri = 'api://${tabAppDomain}/botid-${botId}'
{{else}}
var m365ApplicationIdUri = 'api://${tabAppDomain}/${m365ClientId}'
{{/if}}
{{else if Plugins.fx-resource-bot}}
var m365ApplicationIdUri = 'api://botid-${botId}'
{{/if}}
var teamsMobileOrDesktopAppClientId = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'
var teamsWebAppClientId = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'
var officeWebAppClientId1 = '4345a7b9-9a63-4910-a426-35363201d503'
var officeWebAppClientId2 = '4765445b-32c6-49b0-83e6-1d93765276ca'
var outlookDesktopAppClientId = 'd3590ed6-52b3-4102-aeff-aad2292ab01c'
var outlookWebAppClientId = '00000002-0000-0ff1-ce00-000000000000'
var authorizedClientApplicationIds = '${teamsMobileOrDesktopAppClientId};${teamsWebAppClientId};${officeWebAppClientId1};${officeWebAppClientId2};${outlookDesktopAppClientId};${outlookWebAppClientId}'

resource simpleAuthWebAppSettings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${webAppName}/appsettings'
  properties: {
    AAD_METADATA_ADDRESS: aadMetadataAddress
    ALLOWED_APP_IDS: authorizedClientApplicationIds
    IDENTIFIER_URI: m365ApplicationIdUri
    CLIENT_ID: m365ClientId
    CLIENT_SECRET: m365ClientSecret
    OAUTH_AUTHORITY: oauthAuthority
    {{#if Plugins.fx-resource-frontend-hosting}}
    TAB_APP_ENDPOINT: tabAppEndpoint
    {{/if}}
  }
}
