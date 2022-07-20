// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentConfigs object
@secure()
param currentAppSettings object

var functionAppName = split({{azure-function.outputs.functionAppResourceId}}, '/')[8]
{{#if (contains "aad-app" connections)}}
var m365ClientId = provisionParameters['m365ClientId']
  {{#if (contains "key-vault" connections) }}
var m365ClientSecret = {{key-vault.outputs.m365ClientSecretReference}}
  {{else}}
var m365ClientSecret = provisionParameters['m365ClientSecret']
  {{/if}}
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var oauthAuthority = uri(m365OauthAuthorityHost, m365TenantId)
  {{#if (contains "teams-bot" connections) }}
var botId = provisionParameters['botAadAppClientId']
    {{#if (contains "teams-tab" connections)}}
var m365ApplicationIdUri = 'api://${ {{tabDomainVarName}} }/botid-${botId}'
    {{else}}
var m365ApplicationIdUri = 'api://botid-${botId}'
    {{/if}}
  {{else}}
var m365ApplicationIdUri = 'api://${ {{tabDomainVarName}} }'
  {{/if}}
{{/if}}
{{#if (contains "teams-bot" connections)}}
var botAadAppClientId = provisionParameters['botAadAppClientId']
  {{#if (contains "key-vault" connections) }}
var botAadAppClientSecret = {{key-vault.outputs.botClientSecretReference}}
  {{else}}
var botAadAppClientSecret = provisionParameters['botAadAppClientSecret']
  {{/if}}
{{/if}}

{{#if (contains "teams-tab" connections) }}
var tabEndpoint = {{tabEndpointVarName}}
var currentAllowedOrigins = empty(currentConfigs.cors) ? [] : currentConfigs.cors.allowedOrigins
resource appConfig 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${functionAppName}/web'
  kind: 'functionapp'
  properties: {
    cors: {
      allowedOrigins: union(currentAllowedOrigins, [
        tabEndpoint // allow requests from tab app
      ])
    }
  }
}

{{/if}}
resource functionAppSettings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${functionAppName}/appsettings'
  properties: union({
    {{#if (contains "aad-app" connections)}}
      {{#if (contains "teams-tab" connections)}}
    INITIATE_LOGIN_ENDPOINT: uri(tabEndpoint, 'auth-start.html') // The page is used to let users consent required OAuth permissions during bot SSO process
      {{/if}}
    M365_AUTHORITY_HOST: m365OauthAuthorityHost // AAD authority host
    M365_CLIENT_ID: m365ClientId // Client id of AAD application
    M365_CLIENT_SECRET: m365ClientSecret // Client secret of AAD application
    M365_TENANT_ID: m365TenantId // Tenant id of AAD application
    M365_APPLICATION_ID_URI: m365ApplicationIdUri // Application ID URI of AAD application
    {{/if}}
    {{#if (contains "teams-bot" connections)}}
    BOT_ID: botAadAppClientId // ID of your bot
    BOT_PASSWORD: botAadAppClientSecret // Secret of your bot
    {{/if}}
    {{#if (contains "azure-sql" connections)}}
    SQL_DATABASE_NAME: {{azure-sql.outputs.sqlDatabaseName}} // SQL database name
    SQL_ENDPOINT: {{azure-sql.outputs.sqlEndpoint}} // SQL server endpoint
    {{/if}}
    {{#if (contains "identity" connections)}}
    IDENTITY_ID: {{identity.outputs.identityClientId}} // User assigned identity id, the identity is used to access other Azure resources
    {{/if}}
  }, currentAppSettings)
}

{{#if (contains "aad-app" connections)}}
  {{#if (contains "teams-tab" connections)}}
resource authSettings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${functionAppName}/authsettings'
  properties: {
    enabled: true // Validate access token in request authorization header
    defaultProvider: 'AzureActiveDirectory'
    clientId: m365ClientId
    issuer: '${oauthAuthority}/v2.0' // Issuer of access token
    allowedAudiences: [ // Only allow tokens with following audiences
      m365ClientId
      m365ApplicationIdUri
    ]
  }
}
  {{/if}}
{{/if}}
