param botServiceName string
param botWebAppName string
param botAadClientId string
@secure()
param botAadClientSecret string
param authLoginUriSuffix string
param m365ClientId string
@secure()
param m365ClientSecret string
param m365TenantId string
param m365OauthAuthorityHost string
param m365ApplicationIdUri string
{{#contains 'fx-resource-function' Plugins}}
param functionEndpoint string
{{/contains}}
{{#contains 'fx-resource-azure-sql' Plugins}}
param sqlDatabaseName string
param sqlEndpoint string
{{/contains}}
{{#contains 'fx-resource-identity' Plugins}}
param identityId string
{{/contains}}

var botWebAppHostname = botWebApp.properties.hostNames[0]
var botEndpoint = 'https://${botWebAppHostname}'
var initiateLoginEndpoint = uri(botEndpoint, authLoginUriSuffix)

resource botServices 'Microsoft.BotService/botServices@2021-03-01' existing = {
  name: botServiceName
}

resource botServicesMsTeamsChannel 'Microsoft.BotService/botServices/channels@2021-03-01' = {
  parent: botServices
  location: 'global'
  name: 'MsTeamsChannel'
  properties: {
    channelName: 'MsTeamsChannel'
  }
}

resource botWebApp 'Microsoft.Web/sites@2021-01-01' existing = {
  name: botWebAppName
}

resource botWebAppSettings 'Microsoft.Web/sites/config@2021-01-01' = {
    parent: botWebApp
    name: 'appsettings'
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
      {{#contains 'fx-resource-function' Plugins}}
      API_ENDPOINT: functionEndpoint
      {{/contains}}
      {{#contains 'fx-resource-azure-sql' Plugins}}
      SQL_DATABASE_NAME: sqlDatabaseName
      SQL_ENDPOINT: sqlEndpoint
      {{/contains}}
      {{#contains 'fx-resource-identity' Plugins}}
      IDENTITY_ID: identityId
      {{/contains}}
     }
}
