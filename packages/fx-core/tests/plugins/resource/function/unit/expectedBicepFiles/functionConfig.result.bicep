// Auto generated content, please customize files under provision folder

@secure()
param provisionParameters object
param provisionOutputs object
@secure()
param currentConfigs object
@secure()
param currentAppSettings object

var functionAppName = split(provisionOutputs.functionOutput.value.functionAppId, '/')[8]

var m365ClientId = provisionParameters['m365ClientId']
var m365ClientSecret = provisionParameters['m365ClientSecret']
var m365TenantId = provisionParameters['m365TenantId']
var m365OauthAuthorityHost = provisionParameters['m365OauthAuthorityHost']
var oauthAuthority = uri(m365OauthAuthorityHost, m365TenantId)
var tabAppDomain = provisionOutputs.frontendHostingOutput.value.domain
var tabAppEndpoint = provisionOutputs.frontendHostingOutput.value.endpoint 
var m365ApplicationIdUri = 'api://${tabAppDomain}/${m365ClientId}'

var teamsMobileOrDesktopAppClientId = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'
var teamsWebAppClientId = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346'
var authorizedClientApplicationIds = '${teamsMobileOrDesktopAppClientId};${teamsWebAppClientId}'

var currentAllowedOrigins = empty(currentConfigs.cors) ? [] : currentConfigs.cors.allowedOrigins

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
resource appSettings 'Microsoft.Web/sites/config@2021-01-15' = {
  name: '${functionAppName}/appsettings'
  properties: union({
    API_ENDPOINT: 'https://${provisionOutputs.functionOutput.value.functionAppId}'
    ALLOWED_APP_IDS: authorizedClientApplicationIds
    M365_CLIENT_ID: m365ClientId
    M365_CLIENT_SECRET: m365ClientSecret
    M365_TENANT_ID: m365TenantId
    M365_AUTHORITY_HOST: m365OauthAuthorityHost
    M365_APPLICATION_ID_URI: m365ApplicationIdUri
    IDENTITY_ID: provisionOutputs.identityOutput.value.identityClientId
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
