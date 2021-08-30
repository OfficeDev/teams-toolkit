param botServerfarmsName string
param botWebAppSKU string = 'F1'
param botServiceSKU string = 'F1'
param botWebAppName string

var botWebAppHostname = botWebApp.properties.hostNames[0]
var botEndpoint = 'https://${botWebAppHostname}'

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

output botWebAppSKU string = botWebAppSKU
output botServiceSKU string = botServiceSKU
output botWebAppName string = botWebAppName
output botDomain string = botWebAppHostname
output appServicePlanName string = botServerfarmsName
output botWebAppEndpoint string = botEndpoint
