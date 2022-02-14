// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentConfigs object
@secure()
param currentAppSettings object

var functionAppName = split(\{{fx-resource-function.References.functionAppResourceId}}, '/')[8]

var m365ClientId = provisionParameters['m365ClientId']

{{#if (contains "fx-resource-key-vault" plugins)}}
var m365ClientSecret = \{{fx-resource-key-vault.References.m365ClientSecretReference}}
{{else}}
var m365ClientSecret = provisionParameters['m365ClientSecret']
{{/if}}

var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var oauthAuthority = uri(m365OauthAuthorityHost, m365TenantId)

{{#if (contains "fx-resource-frontend-hosting" plugins) }}
var tabAppDomain = \{{fx-resource-frontend-hosting.References.domain}}
var tabAppEndpoint = \{{fx-resource-frontend-hosting.References.endpoint}}
{{/if}}

{{#if (contains "fx-resource-bot" plugins) }}
var botId = provisionParameters['botAadAppClientId']
{{/if}}

{{#if (contains "fx-resource-frontend-hosting" plugins) }}
  {{#if (contains "fx-resource-bot" plugins) }}
var m365ApplicationIdUri = 'api://${tabAppDomain}/botid-${botId}'
  {{else}}
var m365ApplicationIdUri = 'api://${tabAppDomain}/${m365ClientId}'
  {{/if}}
{{else}}
  {{#if (contains "fx-resource-bot" plugins) }}
var m365ApplicationIdUri = 'api://botid-${botId}'
  {{/if}}
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

var currentAllowedOrigins = empty(currentConfigs.cors) ? [] : currentConfigs.cors.allowedOrigins

{{#if (contains "fx-resource-frontend-hosting" plugins) }}
resource appConfig 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${functionAppName}/web'
  kind: 'functionapp'
  properties: {
    cors: {
      allowedOrigins: union(currentAllowedOrigins, [
        tabAppEndpoint // allow requests from tab app
      ])
    }
  }
}
{{/if}}
resource appSettings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${functionAppName}/appsettings'
  properties: union({
    API_ENDPOINT: \{{fx-resource-function.References.functionEndpoint}} // Azure Functions endpoint
    ALLOWED_APP_IDS: authorizedClientApplicationIds // Only allow tokens issued by these AAD applications
    M365_CLIENT_ID: m365ClientId // Client id of AAD application
    M365_CLIENT_SECRET: m365ClientSecret // Client secret of AAD application
    M365_TENANT_ID: m365TenantId // Tenant id of AAD application
    M365_AUTHORITY_HOST: m365OauthAuthorityHost // AAD authority host
    M365_APPLICATION_ID_URI: m365ApplicationIdUri // Application ID URI of AAD application
    IDENTITY_ID: \{{fx-resource-identity.References.identityClientId}} // User assigned identity id, the identity is used to access other Azure resources
    {{#if (contains "fx-resource-azure-sql" plugins) }}
    SQL_DATABASE_NAME: \{{fx-resource-azure-sql.References.databaseName}} // SQL database name
    SQL_ENDPOINT: \{{fx-resource-azure-sql.References.sqlEndpoint}} // SQL server endpoint
    {{/if}}
  }, currentAppSettings) // Merge new settings with existing settings
}

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
