// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentAppSettings object

var functionName = split(provisionOutputs.{{moduleName}}Output.value.resourceId, '/')[8]

{{#if (contains "fx-resource-aad-app-for-teams" plugins)}}
var m365ClientId = provisionParameters['m365ClientId']
  {{#if (contains "fx-resource-key-vault" plugins) }}
var m365ClientSecret = \{{fx-resource-key-vault.References.m365ClientSecretReference}}
  {{else}}
var m365ClientSecret = provisionParameters['m365ClientSecret']
  {{/if}}
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
  {{#if (contains "fx-resource-frontend-hosting" plugins)}}
    {{#if (contains "fx-resource-bot" plugins) }}
var m365ApplicationIdUri = 'api://${ \{{fx-resource-frontend-hosting.References.domain}} }/botid-${botAadAppClientId}'
    {{/if}}
  {{else}}
var m365ApplicationIdUri = 'api://botid-${botAadAppClientId}'
  {{/if}}
{{/if}}

{{#if (contains "fx-resource-bot" plugins) }}
var botAadAppClientId = provisionParameters['botAadAppClientId']
  {{#if (contains "fx-resource-key-vault" plugins) }}
var botAadAppClientSecret = \{{fx-resource-key-vault.References.botClientSecretReference}}
  {{else}}
var botAadAppClientSecret = provisionParameters['botAadAppClientSecret']
  {{/if}}
{{/if}}

resource {{moduleName}}Settings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${functionName}/appsettings'
  properties: union({
{{#if (contains "fx-resource-aad-app-for-teams" plugins)}}
  {{#if (contains "dotnet" configs)}}
    TeamsFx__Authentication__ClientId: m365ClientId
    TeamsFx__Authentication__ClientSecret: m365ClientSecret
    TeamsFx__Authentication__OAuthAuthority: m365OauthAuthorityHost
  {{/if}}
  {{#if (contains "node" configs)}}
    INITIATE_LOGIN_ENDPOINT: uri(provisionOutputs.botFunctionOutput.value.siteEndpoint, 'auth-start.html') // The page is used to let users consent required OAuth permissions during bot SSO process
    M365_AUTHORITY_HOST: m365OauthAuthorityHost // AAD authority host
    M365_CLIENT_ID: m365ClientId // Client id of AAD application
    M365_CLIENT_SECRET: m365ClientSecret // Client secret of AAD application
    M365_TENANT_ID: m365TenantId // Tenant id of AAD application
    M365_APPLICATION_ID_URI: m365ApplicationIdUri // Application ID URI of AAD application
  {{/if}}
{{/if}}
{{#if (contains "fx-resource-bot" plugins) }}
    BOT_ID: botAadAppClientId // ID of your bot
    BOT_PASSWORD: botAadAppClientSecret // Secret of your bot
{{/if}}
{{#if (contains "fx-resource-function" plugins) }}
    API_ENDPOINT: provisionOutputs.functionOutput.value.functionEndpoint // Azure Function endpoint
{{/if}}
{{#if (contains "fx-resource-azure-sql" plugins)}}
    SQL_DATABASE_NAME: \{{fx-resource-azure-sql.References.databaseName}} // SQL database name
    SQL_ENDPOINT: \{{fx-resource-azure-sql.References.sqlEndpoint}} // SQL server endpoint
{{/if}}
{{#if (contains "fx-resource-identity" plugins)}}
    IDENTITY_ID: \{{fx-resource-identity.References.identityClientId}} // User assigned identity id, the identity is used to access other Azure resources
{{/if}}
  }, currentAppSettings)
}
