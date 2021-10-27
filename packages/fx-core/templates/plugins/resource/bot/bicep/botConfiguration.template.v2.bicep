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
var tabAppDomain = provisionOutputs.frontendHostingOutput.value.domain
var botId = provisionParameters['botAadAppClientId']
var m365ApplicationIdUri = 'api://${tabAppDomain}}/botid-${botId}'

resource botWebAppSettings 'Microsoft.Web/sites/config@2021-01-15' = {
  name: '${botWebAppName}/appsettings'
  properties: union({
    INITIATE_LOGIN_ENDPOINT: uri(provisionOutputs.botOutput.value.webAppEndpoint, 'auth-start.html')
    M365_AUTHORITY_HOST: m365OauthAuthorityHost
    M365_CLIENT_ID: m365ClientId
    M365_CLIENT_SECRET: m365ClientSecret
    M365_TENANT_ID: m365TenantId
    M365_APPLICATION_ID_URI: m365ApplicationIdUri
    API_ENDPOINT: provisionOutputs.functionOutput.value.endpoint
    SQL_DATABASE_NAME: provisionOutputs.azureSqlOutput.value.sqlDatabaseName
    SQL_ENDPOINT: provisionOutputs.azureSqlOutput.value.sqlServerEndpoint
    IDENTITY_ID: provisionOutputs.identityOutput.value.resourceId
  }, currentAppSettings)
}
