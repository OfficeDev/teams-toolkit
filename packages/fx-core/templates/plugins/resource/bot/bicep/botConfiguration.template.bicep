{{#if createNewBotService}}
param botServiceName string
{{/if}}
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

var initiateLoginEndpoint = uri(botEndpoint, authLoginUriSuffix)

{{#if createNewBotService}}
resource botServicesMsTeamsChannel 'Microsoft.BotService/botServices/channels@2021-03-01' = {
  location: 'global'
  name: '${botServiceName}/MsTeamsChannel'
  properties: {
    channelName: 'MsTeamsChannel'
  }
}

{{/if}}
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
