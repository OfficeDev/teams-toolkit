// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentConfigs object
@secure()
param currentAppSettings object

var functionAppName = split({{PluginOutput.fx-resource-function.References.functionAppResourceId}}, '/')[8]

var m365ClientId = provisionParameters['m365ClientId']
var m365ClientSecret = provisionParameters['m365ClientSecret']
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var oauthAuthority = uri(m365OauthAuthorityHost, m365TenantId)
{{#contains 'fx-resource-frontend-hosting' Plugins}}
var tabAppDomain = {{../PluginOutput.fx-resource-frontend-hosting.References.domain}}
var tabAppEndpoint = {{../PluginOutput.fx-resource-frontend-hosting.References.endpoint}} 
{{/contains}}
{{#contains 'fx-resource-bot' Plugins}}
var botId = provisionParameters['botAadAppClientId']
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
var authorizedClientApplicationIds = '${teamsMobileOrDesktopAppClientId};${teamsWebAppClientId}'

var currentAllowedOrigins = empty(currentConfigs.cors) ? [] : currentConfigs.cors.allowedOrigins

{{#contains 'fx-resource-frontend-hosting' Plugins}}
resource appConfig 'Microsoft.Web/sites/config@2021-01-15' = {
  name: '${functionAppName}/web'
  kind: 'functionapp'
  properties: {
    cors: {
      allowedOrigins: union(currentAllowedOrigins, [
        tabAppEndpoint
      ])
    }
  }
}
{{/contains}}
resource appSettings 'Microsoft.Web/sites/config@2021-01-15' = {
  name: '${functionAppName}/appsettings'
  properties: union({
    API_ENDPOINT: 'https://${ {{~PluginOutput.fx-resource-function.References.functionAppResourceId~}} }'
    ALLOWED_APP_IDS: authorizedClientApplicationIds
    M365_CLIENT_ID: m365ClientId
    M365_CLIENT_SECRET: m365ClientSecret
    M365_TENANT_ID: m365TenantId
    M365_AUTHORITY_HOST: m365OauthAuthorityHost
    M365_APPLICATION_ID_URI: m365ApplicationIdUri
    IDENTITY_ID: {{PluginOutput.fx-resource-identity.References.identityClientId}}
    {{#contains 'fx-resource-azure-sql' Plugins}}
    SQL_DATABASE_NAME: {{../PluginOutput.fx-resource-azure-sql.References.sqlDatabaseName}}
    SQL_ENDPOINT: {{../PluginOutput.fx-resource-azure-sql.References.sqlServerEndpoint}}
    {{/contains}}
  }, currentAppSettings)
}

resource authSettings 'Microsoft.Web/sites/config@2021-01-15' = {
  name: '${functionAppName}/authsettings'
  properties: {
    enabled: true
    defaultProvider: 'AzureActiveDirectory'
    clientId: m365ClientId
    issuer: '${oauthAuthority}/v2.0'
    allowedAudiences: [
      m365ClientId
      m365ApplicationIdUri
    ]
  }
}
