// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentAppSettings object

var webappName = split(provisionOutputs.webappOutput.value.webappResourceId, '/')[8]
{{#if (contains "fx-resource-aad-app-for-teams" plugins)}}
var m365ClientId = provisionParameters['m365ClientId']
  {{#if (contains "fx-resource-key-vault" plugins)}}
var m365ClientSecret = \{{fx-resource-key-vault.References.m365ClientSecretReference}}
  {{else}}
var m365ClientSecret = provisionParameters['m365ClientSecret']
  {{/if}}
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var oauthAuthority = uri(m365OauthAuthorityHost, m365TenantId)
var initiateLoginEndpoint = uri(webappEndpoint, 'auth-start.html')
{{/if}}
var webappEndpoint = provisionOutputs.webappOutput.value.endpoint
{{#if (contains "fx-resource-bot" plugins) }}
var botAadAppClientId = provisionParameters['botAadAppClientId']
  {{#if (contains "fx-resource-key-vault" plugins) }}
var botAadAppClientSecret = \{{fx-resource-key-vault.References.botClientSecretReference}}
  {{else}}
var botAadAppClientSecret = provisionParameters['botAadAppClientSecret']
  {{/if}}
{{/if}}

resource appSettings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${webappName}/appsettings'
  properties: union({
    TAB_APP_ENDPOINT: webappEndpoint
    {{#if (contains "fx-resource-aad-app-for-teams" plugins)}}
    TeamsFx__Authentication__ClientId: m365ClientId
    TeamsFx__Authentication__ClientSecret: m365ClientSecret
    TeamsFx__Authentication__InitiateLoginEndpoint: initiateLoginEndpoint
    TeamsFx__Authentication__OAuthAuthority: oauthAuthority
    {{/if}}
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
