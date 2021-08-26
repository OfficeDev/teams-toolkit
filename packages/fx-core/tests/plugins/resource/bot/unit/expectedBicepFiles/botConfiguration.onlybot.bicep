param botServiceName string
param botWebAppName string
param botAadClientId string
@secure()
param botAadClientSecret string
param authLoginUriSuffix string
param botEndpoint string
param m365ClientId string
@secure()
param m365ClientSecret string
param m365TenantId string
param m365OauthAuthorityHost string
param m365ApplicationIdUri string

var initiateLoginEndpoint = uri(botEndpoint, authLoginUriSuffix)

resource botServicesMsTeamsChannel 'Microsoft.BotService/botServices/channels@2021-03-01' = {
  location: 'global'
  name: '${botServiceName}/MsTeamsChannel'
  properties: {
    channelName: 'MsTeamsChannel'
  }
}

resource botWebAppSettings 'Microsoft.Web/sites/config@2021-01-01' = {
    name: '${botWebAppName}/appsettings'
     properties: {
      BOT_ID: botAadClientId
      BOT_PASSWORD: botAadClientSecret
      INITIATE_LOGIN_ENDPOINT: initiateLoginEndpoint
      M365_APPLICATION_ID_URI: m365ApplicationIdUri
      M365_AUTHORITY_HOST: m365OauthAuthorityHost
      M365_CLIENT_ID: m365ClientId
      M365_CLIENT_SECRET: m365ClientSecret
      M365_TENANT_ID: m365TenantId
      SCM_DO_BUILD_DURING_DEPLOYMENT: 'true'
      WEBSITE_NODE_DEFAULT_VERSION: '12.13.0'
     }
}
