param userAssignedIdentityId string
param provisionParameters object
var resourceBaseName = provisionParameters.resourceBaseName
var botAadAppClientId = provisionParameters['botAadAppClientId']
var botAadAppClientSecret = provisionParameters['botAadAppClientSecret']
var botServiceName = contains(provisionParameters, 'botServiceName') ? provisionParameters['botServiceName'] : '${resourceBaseName}-bot-service'
var botDisplayName = contains(provisionParameters, 'botDisplayName') ? provisionParameters['botDisplayName'] : '${resourceBaseName}-bot-displayname'
var serverfarmsName = contains(provisionParameters, 'botServerfarmsName') ? provisionParameters['botServerfarmsName'] : '${resourceBaseName}-bot-serverfarms'
var webAppSKU = contains(provisionParameters, 'botWebAppSKU') ? provisionParameters['botWebAppSKU'] : 'F1'
var webAppName = contains(provisionParameters, 'botSitesName') ? provisionParameters['botSitesName'] : '${resourceBaseName}-bot-sites'

resource botService 'Microsoft.BotService/botServices@2021-03-01' = {
  kind: 'azurebot'
  location: 'global'
  name: botServiceName
  properties: {
    displayName: botDisplayName
    endpoint: uri('https://${webApp.properties.defaultHostName}', '/api/messages')
    msaAppId: botAadAppClientId
  }
  sku: {
    name: 'F0'
  }
}

resource botServiceMsTeamsChannel 'Microsoft.BotService/botServices/channels@2021-03-01' = {
  parent: botService
  location: 'global'
  name: 'MsTeamsChannel'
  properties: {
    channelName: 'MsTeamsChannel'
  }
}

resource serverfarm 'Microsoft.Web/serverfarms@2021-01-01' = {
  kind: 'app'
  location: resourceGroup().location
  name: serverfarmsName
  sku: {
    name: webAppSKU
  }
}

resource webApp 'Microsoft.Web/sites@2021-01-01' = {
  kind: 'app'
  location: resourceGroup().location
  name: webAppName
  properties: {
    serverFarmId: serverfarm.id
    siteConfig: {
      appSettings: [
        {
          name: 'BOT_ID'
          value: botAadAppClientId
        }
        {
          name: 'BOT_PASSWORD'
          value: botAadAppClientSecret
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '12.13.0'
        }
      ]
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
}

output webAppResourceId string = webApp.id
output webAppHostName string = webApp.properties.defaultHostName
output webAppEndpoint string = 'https://${webApp.properties.defaultHostName}'
