// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentAppSettings object

var botWebAppName = split(provisionOutputs.botOutput.value.botWebAppResourceId, '/')[8]
var m365ClientId = provisionParameters['m365ClientId']
{{#contains 'fx-resource-key-vault' Plugins}}
var m365ClientSecret = {{../PluginOutput.fx-resource-key-vault.References.m365ClientSecretReference}}
{{/contains}}
{{#notContains 'fx-resource-key-vault' Plugins}}
var m365ClientSecret = provisionParameters['m365ClientSecret']
{{/notContains}}
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var botAadAppClientId = provisionParameters['botAadAppClientId']
{{#contains 'fx-resource-key-vault' Plugins}}
var botAadAppClientSecret = {{../PluginOutput.fx-resource-key-vault.References.botClientSecretReference}}
{{/contains}}
{{#notContains 'fx-resource-key-vault' Plugins}}
var botAadAppClientSecret = provisionParameters['botAadAppClientSecret']
{{/notContains}}

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
    {{#contains 'fx-resource-function' Plugins}}
    API_ENDPOINT: provisionOutputs.functionOutput.value.functionEndpoint
    {{/contains}}
    {{#contains 'fx-resource-azure-sql' Plugins}}
    SQL_DATABASE_NAME: {{../PluginOutput.fx-resource-azure-sql.References.databaseName}}
    SQL_ENDPOINT: {{../PluginOutput.fx-resource-azure-sql.References.sqlEndpoint}}
    {{/contains}}
    IDENTITY_ID: {{PluginOutput.fx-resource-identity.References.identityClientId}}
  }, currentAppSettings)
}
