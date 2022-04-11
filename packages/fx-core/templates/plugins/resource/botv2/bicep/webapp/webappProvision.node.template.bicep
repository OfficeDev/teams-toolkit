@secure()
param provisionParameters object

var resourceBaseName = provisionParameters.resourceBaseName
var serverfarmsName = contains(provisionParameters, 'botServerfarmsName') ? provisionParameters['botServerfarmsName'] : '${resourceBaseName}bot' // Try to read name for App Service Plan from parameters
var webAppSKU = contains(provisionParameters, 'botWebAppSKU') ? provisionParameters['botWebAppSKU'] : 'F1' // Try to read SKU for Azure Web App from parameters
var webAppName = contains(provisionParameters, 'botSitesName') ? provisionParameters['botSitesName'] : '${resourceBaseName}bot' // Try to read name for Azure Web App from parameters

// Compute resources for your Web App
resource serverfarm 'Microsoft.Web/serverfarms@2021-02-01' = {
  kind: 'app'
  location: resourceGroup().location
  name: serverfarmsName
  sku: {
    name: webAppSKU
  }
}

// Web App that hosts your bot
resource webApp 'Microsoft.Web/sites@2021-02-01' = {
  kind: 'app'
  location: resourceGroup().location
  name: webAppName
  properties: {
    serverFarmId: serverfarm.id
    siteConfig: {
      appSettings: {{APP_SETTINGS}}
    }
  }
}

output webAppSKU string = webAppSKU
output webAppName string = webAppName
output domain string = webApp.properties.defaultHostName
output appServicePlanName string = serverfarmsName
output webAppResourceId string = webApp.id
output webAppEndpoint string = 'https://${webApp.properties.defaultHostName}'
