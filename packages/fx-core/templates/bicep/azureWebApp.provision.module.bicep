@secure()
param provisionParameters object

var resourceBaseName = provisionParameters.resourceBaseName
var serverfarmsName = contains(provisionParameters, 'webAppServerfarmsName') ? provisionParameters['webAppServerfarmsName'] : '${resourceBaseName}webApp' // Try to read name for App Service Plan from parameters
var webAppSKU = contains(provisionParameters, 'webAppSKU') ? provisionParameters['webAppSKU'] : 'F1' // Try to read SKU for Azure Web App from parameters
var webAppName = contains(provisionParameters, 'webAppSitesName') ? provisionParameters['webAppSitesName'] : '${resourceBaseName}webApp' // Try to read name for Azure Web App from parameters
 
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
      appSettings: [
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true' // Execute build steps on your site during deployment
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~14' // Set NodeJS version to 14.x for your site
        }
        {
          name: 'RUNNING_ON_AZURE'
          value: '1'
        }
      ]
    }
  }
}

output sku string = webAppSKU
output appName string = webAppName
output domain string = webApp.properties.defaultHostName
output appServicePlanName string = serverfarmsName
output resourceId string = webApp.id
output endpoint string = 'https://${webApp.properties.defaultHostName}'
