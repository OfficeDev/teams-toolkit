// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentAppSettings object

var botWebAppName = split(provisionOutputs.botOutput.value.botWebAppResourceId, '/')[8]
var m365ClientId = provisionParameters['m365ClientId']

{{#if (contains "fx-resource-key-vault" plugins) }}
var m365ClientSecret = \{{fx-resource-key-vault.References.m365ClientSecretReference}}
{{else}}
var m365ClientSecret = provisionParameters['m365ClientSecret']
{{/if}}

var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var botAadAppClientId = provisionParameters['botAadAppClientId']

{{#if (contains "fx-resource-key-vault" plugins) }}
var botAadAppClientSecret = \{{fx-resource-key-vault.References.botClientSecretReference}}
{{else}}
var botAadAppClientSecret = provisionParameters['botAadAppClientSecret']
{{/if}}

var botId = provisionParameters['botAadAppClientId']

{{#if (contains "fx-resource-frontend-hosting" plugins) }}
  {{#if (contains "fx-resource-bot" plugins) }}
var m365ApplicationIdUri = 'api://${ \{{fx-resource-frontend-hosting.References.domain}} }/botid-${botId}'
  {{else }}
var m365ApplicationIdUri = 'api://${ \{{fx-resource-frontend-hosting.References.domain}} }/${m365ClientId}'
  {{/if}}
{{else}}
  {{#if (contains "fx-resource-bot" plugins) }}
var m365ApplicationIdUri = 'api://botid-${botId}'
  {{/if}}
{{/if}}

resource botWebAppSettings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${botWebAppName}/appsettings'
  properties: union({
    INITIATE_LOGIN_ENDPOINT: uri(provisionOutputs.botOutput.value.siteEndpoint, 'auth-start.html')
    M365_AUTHORITY_HOST: m365OauthAuthorityHost
    M365_CLIENT_ID: m365ClientId
    M365_CLIENT_SECRET: m365ClientSecret
    M365_TENANT_ID: m365TenantId
    M365_APPLICATION_ID_URI: m365ApplicationIdUri
    BOT_ID: botAadAppClientId
    BOT_PASSWORD: botAadAppClientSecret
    {{#if (contains "fx-resource-function" plugins) }}
    API_ENDPOINT: provisionOutputs.functionOutput.value.functionEndpoint
    {{/if}}
    {{#if (contains "fx-resource-azure-sql" plugins)}}
    SQL_DATABASE_NAME: \{{fx-resource-azure-sql.References.databaseName}}
    SQL_ENDPOINT: \{{fx-resource-azure-sql.References.sqlEndpoint}}
    {{/if}}
    IDENTITY_ID: \{{fx-resource-identity.References.identityClientId}}
  }, currentAppSettings)
}
