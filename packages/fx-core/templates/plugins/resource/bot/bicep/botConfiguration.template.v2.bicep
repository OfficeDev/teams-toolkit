// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentAppSettings object

var botWebAppName = split(provisionOutputs.botOutput.value.webAppResourceId, '/')[8]

var m365ClientId = provisionParameters['m365ClientId']
var m365ClientSecret = provisionParameters['m365ClientSecret']
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']

var botId = provisionParameters['botAadAppClientId']

{{#contains 'fx-resource-frontend-hosting' Plugins}}
{{#notContains 'fx-resource-bot' ../Plugins}}
var m365ApplicationIdUri = 'api://${ {{~../PluginOutput.fx-resource-frontend-hosting.References.domain~}} }/${m365ClientId}'
{{/notContains}}
{{#contains 'fx-resource-bot' ../Plugins}}
var m365ApplicationIdUri = 'api://${ {{~../PluginOutput.fx-resource-frontend-hosting.References.domain~}} }/botid-${botId}'
{{/contains}}
{{/contains}}
{{#notContains 'fx-resource-frontend-hosting' Plugins}}
{{#contains 'fx-resource-bot' ../Plugins}}
var m365ApplicationIdUri = 'api://botid-${botId}'
{{/contains}}
{{/notContains}}

resource botWebAppSettings 'Microsoft.Web/sites/config@2021-01-15' = {
  name: '${botWebAppName}/appsettings'
  properties: union({
    INITIATE_LOGIN_ENDPOINT: uri(provisionOutputs.botOutput.value.webAppEndpoint, 'auth-start.html')
    M365_AUTHORITY_HOST: m365OauthAuthorityHost
    M365_CLIENT_ID: m365ClientId
    M365_CLIENT_SECRET: m365ClientSecret
    M365_TENANT_ID: m365TenantId
    M365_APPLICATION_ID_URI: m365ApplicationIdUri
    {{#contains 'fx-resource-function' Plugins}}
    API_ENDPOINT: provisionOutputs.functionOutput.value.endpoint
    {{/contains}}
    {{#contains 'fx-resource-azure-sql' Plugins}}
    SQL_DATABASE_NAME: provisionOutputs.azureSqlOutput.value.sqlDatabaseName
    SQL_ENDPOINT: provisionOutputs.azureSqlOutput.value.sqlServerEndpoint
    {{/contains}}
    IDENTITY_ID: provisionOutputs.identityOutput.value.resourceId
  }, currentAppSettings)
}
