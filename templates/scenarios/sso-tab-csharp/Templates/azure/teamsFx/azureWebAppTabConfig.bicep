// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentAppSettings object

var webAppName = split(provisionOutputs.azureWebAppTabOutput.value.resourceId, '/')[8]
var webappEndpoint = provisionOutputs.azureWebAppTabOutput.value.siteEndpoint
var m365ClientId = provisionParameters['m365ClientId']
var m365ClientSecret = provisionParameters['m365ClientSecret']
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']

resource webAppSettings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${webAppName}/appsettings'
  properties: union({
    TeamsFx__Authentication__ClientId: m365ClientId // Client id of AAD application
    TeamsFx__Authentication__ClientSecret: m365ClientSecret // Client secret of AAD application
    TeamsFx__Authentication__OAuthAuthority: uri(m365OauthAuthorityHost, m365TenantId) // AAD authority host
    TAB_APP_ENDPOINT: webappEndpoint
    IDENTITY_ID: provisionOutputs.identityOutput.value.identityClientId // User assigned identity id, the identity is used to access other Azure resources
  }, currentAppSettings)
}
