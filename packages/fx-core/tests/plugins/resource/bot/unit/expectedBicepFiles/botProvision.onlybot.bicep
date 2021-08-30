param botServiceName string
param botServerfarmsName string
param botWebAppSKU string = 'F1'
param botServiceSKU string = 'F1'
param botWebAppName string
param botAadClientId string
param botDisplayName string

var botWebAppHostname = botWebApp.properties.hostNames[0]
var botEndpoint = 'https://${botWebAppHostname}'

resource botServices 'Microsoft.BotService/botServices@2021-03-01' = {
  kind: 'azurebot'
  location: 'global'
  name: botServiceName
  properties: {
    displayName: botDisplayName
    endpoint: uri(botEndpoint, '/api/messages')
    msaAppId: botAadClientId
  }
  sku: {
    name: botServiceSKU
  }
}

resource botServerfarm 'Microsoft.Web/serverfarms@2021-01-01' = {
  kind: 'app'
  location: resourceGroup().location
  name: botServerfarmsName
  properties: {
    reserved: false
  }
  sku: {
    name: botWebAppSKU
  }
}

resource botWebApp 'Microsoft.Web/sites@2021-01-01' = {
  kind: 'app'
  location: resourceGroup().location
  name: botWebAppName
  properties: {
    reserved: false
    serverFarmId: botServerfarm.id
    siteConfig: {
      alwaysOn: false
      http20Enabled: false
      numberOfWorkers: 1
    }
  }
}

output botWebAppSKU string = botWebAppSKU // skuName
output botServiceSKU string = botServiceSKU
output botWebAppName string = botWebAppName // siteName
output botDomain string = botWebAppHostname // validDomain
output appServicePlanName string = botServerfarmsName // appServicePlan
output botServiceName string = botServiceName // botChannelReg
output botWebAppEndpoint string = botEndpoint // siteEndpoint
