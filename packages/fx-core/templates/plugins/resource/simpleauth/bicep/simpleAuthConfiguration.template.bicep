// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentAppSettings object

var webAppName = split(provisionOutputs.simpleAuthOutput.value.webAppResourceId, '/')[8]

var m365ClientId = provisionParameters['m365ClientId']
{{#if (contains "fx-resource-key-vault" plugins)}}
var m365ClientSecret = \{{fx-resource-key-vault.References.m365ClientSecretReference}}
{{else}}
var m365ClientSecret = provisionParameters['m365ClientSecret']
{{/if}}
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var oauthAuthority = uri(m365OauthAuthorityHost, m365TenantId)
var aadMetadataAddress = uri(m365OauthAuthorityHost, '${m365TenantId}/v2.0/.well-known/openid-configuration')
{{#if (contains "fx-resource-bot" plugins)}}
var botId = provisionParameters['botAadAppClientId']
{{/if}}
{{#if (contains "fx-resource-frontend-hosting" plugins)}}
var tabAppDomain = \{{fx-resource-frontend-hosting.References.domain}}
var tabAppEndpoint = \{{fx-resource-frontend-hosting.References.endpoint}} 
{{/if}}

{{#if (contains "fx-resource-frontend-hosting" plugins)}}
  {{#if (contains "fx-resource-bot" plugins)}}
var m365ApplicationIdUri = 'api://${tabAppDomain}/botid-${botId}'
  {{else}}
var m365ApplicationIdUri = 'api://${tabAppDomain}/${m365ClientId}'
  {{/if}}
{{else if (contains "fx-resource-bot" plugins)}}
var m365ApplicationIdUri = 'api://botid-${botId}'
{{/if}}

var teamsMobileOrDesktopAppClientId = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'
var teamsWebAppClientId = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'
var officeWebAppClientId1 = '4345a7b9-9a63-4910-a426-35363201d503'
var officeWebAppClientId2 = '4765445b-32c6-49b0-83e6-1d93765276ca'
var officeDesktopAppClientId = '0ec893e0-5785-4de6-99da-4ed124e5296c'
var outlookDesktopAppClientId = 'd3590ed6-52b3-4102-aeff-aad2292ab01c'
var outlookWebAppClientId1 = '00000002-0000-0ff1-ce00-000000000000'
var outlookWebAppClientId2 = 'bc59ab01-8403-45c6-8796-ac3ef710b3e3'
var authorizedClientApplicationIds = '${teamsMobileOrDesktopAppClientId};${teamsWebAppClientId};${officeWebAppClientId1};${officeWebAppClientId2};${officeDesktopAppClientId};${outlookDesktopAppClientId};${outlookWebAppClientId1};${outlookWebAppClientId2}'

resource simpleAuthWebAppSettings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${webAppName}/appsettings'
  properties: {
    AAD_METADATA_ADDRESS: aadMetadataAddress // AAD metadata address used to validate access tokens
    ALLOWED_APP_IDS: authorizedClientApplicationIds // Only allow access tokens from these clients
    IDENTIFIER_URI: m365ApplicationIdUri // Application ID URI of AAD app
    CLIENT_ID: m365ClientId // Client id of AAD app
    CLIENT_SECRET: m365ClientSecret // Client secret of AAD app
    OAUTH_AUTHORITY: oauthAuthority // AAD authority
    {{#if (contains "fx-resource-frontend-hosting" plugins)}}
    TAB_APP_ENDPOINT: tabAppEndpoint // Enable CORS for tab app
    {{/if}}
  }
}
