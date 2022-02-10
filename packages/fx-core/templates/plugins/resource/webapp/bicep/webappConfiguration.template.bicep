// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentAppSettings object

var webappName = split(provisionOutputs.webappOutput.value.webappResourceId, '/')[8]

var m365ClientId = provisionParameters['m365ClientId']
{{#if (contains "fx-resource-key-vault" plugins)}}
var m365ClientSecret = \{{fx-resource-key-vault.References.m365ClientSecretReference}}
{{else}}
var m365ClientSecret = provisionParameters['m365ClientSecret']
{{/if}}

var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var oauthAuthority = uri(m365OauthAuthorityHost, m365TenantId)

var webappDomain = provisionOutputs.webappOutput.value.domain
var webappEndpoint = provisionOutputs.webappOutput.value.endpoint

{{#if (contains "fx-resource-bot" plugins) }}
var botAadAppClientId = provisionParameters['botAadAppClientId']
  {{#if (contains "fx-resource-key-vault" plugins) }}
var botAadAppClientSecret = \{{fx-resource-key-vault.References.botClientSecretReference}}
  {{else}}
var botAadAppClientSecret = provisionParameters['botAadAppClientSecret']
  {{/if}}
{{/if}}

{{#if (contains "fx-resource-bot" plugins) }}
var m365ApplicationIdUri = 'api://${webappDomain}/botid-${botAadAppClientId}'
{{else}}
var m365ApplicationIdUri = 'api://${webappDomain}/${m365ClientId}'
{{/if}}
var aadMetadataAddress = uri(m365OauthAuthorityHost, '${m365TenantId}/v2.0/.well-known/openid-configuration')
var initiateLoginEndpoint = uri(webappEndpoint, 'auth-start.html')

var teamsMobileOrDesktopAppClientId = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'
var teamsWebAppClientId = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'
var officeWebAppClientId1 = '4345a7b9-9a63-4910-a426-35363201d503'
var officeWebAppClientId2 = '4765445b-32c6-49b0-83e6-1d93765276ca'
var outlookDesktopAppClientId = 'd3590ed6-52b3-4102-aeff-aad2292ab01c'
var outlookWebAppClientId = '00000002-0000-0ff1-ce00-000000000000'
var authorizedClientApplicationIds = '${teamsMobileOrDesktopAppClientId};${teamsWebAppClientId};${officeWebAppClientId1};${officeWebAppClientId2};${outlookDesktopAppClientId};${outlookWebAppClientId}'

resource appSettings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${webappName}/appsettings'
  properties: union({
    AAD_METADATA_ADDRESS: aadMetadataAddress
    CLIENT_ID: m365ClientId
    CLIENT_SECRET: m365ClientSecret
    IDENTIFIER_URI: m365ApplicationIdUri
    OAUTH_AUTHORITY: oauthAuthority
    TAB_APP_ENDPOINT: webappEndpoint
    TeamsFx__Authentication__ClientId: m365ClientId
    TeamsFx__Authentication__InitiateLoginEndpoint: initiateLoginEndpoint
    TeamsFx__Authentication__SimpleAuthEndpoint: webappEndpoint
    ALLOWED_APP_IDS: authorizedClientApplicationIds
    M365_TENANT_ID: m365TenantId
    {{#if (contains "fx-resource-bot" plugins) }}
    BOT_ID: botAadAppClientId
    BOT_PASSWORD: botAadAppClientSecret
    {{/if}}
    {{#if (contains "fx-resource-azure-sql" plugins) }}
    SQL_DATABASE_NAME: \{{fx-resource-azure-sql.References.databaseName}}
    SQL_ENDPOINT: \{{fx-resource-azure-sql.References.sqlEndpoint}}
    {{/if}}
    IDENTITY_ID: \{{fx-resource-identity.References.identityClientId}}
  }, currentAppSettings)
}
