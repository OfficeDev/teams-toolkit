@maxLength(20)
@minLength(4)
param resourceBaseName string

@description('Required when create Azure Bot service')
param botAadAppClientId string
param staticWebAppSku string
@secure()
@description('Required by Bot Framework package in your bot project')
param botAadAppClientSecret string

param webAppSKU string

@maxLength(42)
param botDisplayName string

param serverfarmsName string = resourceBaseName
param webAppName string = resourceBaseName

param location string = resourceGroup().location

param staticWebAppName string = resourceBaseName

// Azure Static Web App that hosts your static web site
resource swa 'Microsoft.Web/staticSites@2022-09-01' = {
  name: staticWebAppName
  // SWA do not need location setting
  location: 'centralus'
  sku: {
    name: staticWebAppSku
    tier: staticWebAppSku
  }
  properties:{}
}

var siteDomain = swa.properties.defaultHostname

// Compute resources for your Web App
resource serverfarm 'Microsoft.Web/serverfarms@2021-02-01' = {
  kind: 'app'
  location: location
  name: serverfarmsName
  sku: {
    name: webAppSKU
  }
}

// Web App that hosts your bot
resource webApp 'Microsoft.Web/sites@2021-02-01' = {
  kind: 'app'
  location: location
  name: webAppName
  properties: {
    serverFarmId: serverfarm.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
      appSettings: [
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1' // Run Azure App Service from a package file
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18' // Set NodeJS version to 18.x for your site
        }
        {
          name: 'RUNNING_ON_AZURE'
          value: '1'
        }
        {
          name: 'BOT_ID'
          value: botAadAppClientId
        }
        {
          name: 'BOT_PASSWORD'
          value: botAadAppClientSecret
        }
      ]
      ftpsState: 'FtpsOnly'
    }
  }
}

// Register your web service as a bot with the Bot Framework
module azureBotRegistration './botRegistration/azurebot.bicep' = {
  name: 'Azure-Bot-registration'
  params: {
    resourceBaseName: resourceBaseName
    botAadAppClientId: botAadAppClientId
    botAppDomain: webApp.properties.defaultHostName
    botDisplayName: botDisplayName
  }
}

// The output will be persisted in .env.{envName}. Visit https://aka.ms/teamsfx-actions/arm-deploy for more details.
output TAB_DOMAIN string = siteDomain
output TAB_ENDPOINT string = 'https://${siteDomain}'
output BOT_AZURE_APP_SERVICE_RESOURCE_ID string = webApp.id
output BOT_DOMAIN string = webApp.properties.defaultHostName
output AZURE_STATIC_WEB_APPS_RESOURCE_ID string = swa.id
