// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentAppSettings object

var functionName = split(provisionOutputs.botFunctionOutput.value.resourceId, '/')[8]

var m365ClientId = provisionParameters['m365ClientId']
var m365ClientSecret = provisionParameters['m365ClientSecret']
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var m365ApplicationIdUri = 'api://botid-${botAadAppClientId}'

var botAadAppClientId = provisionParameters['botAadAppClientId']
var botAadAppClientSecret = provisionParameters['botAadAppClientSecret']

resource botFunctionSettings 'Microsoft.Web/sites/config@2021-02-01' = {
  name: '${functionName}/appsettings'
  properties: union({
    INITIATE_LOGIN_ENDPOINT: uri(provisionOutputs.botFunctionOutput.value.siteEndpoint, 'auth-start.html') // The page is used to let users consent required OAuth permissions during bot SSO process
    M365_AUTHORITY_HOST: m365OauthAuthorityHost // AAD authority host
    M365_CLIENT_ID: m365ClientId // Client id of AAD application
    M365_CLIENT_SECRET: m365ClientSecret // Client secret of AAD application
    M365_TENANT_ID: m365TenantId // Tenant id of AAD application
    M365_APPLICATION_ID_URI: m365ApplicationIdUri // Application ID URI of AAD application
    BOT_ID: botAadAppClientId // ID of your bot
    BOT_PASSWORD: botAadAppClientSecret // Secret of your bot
  }, currentAppSettings)
}
