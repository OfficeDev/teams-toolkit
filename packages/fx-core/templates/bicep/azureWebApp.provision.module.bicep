@secure()
param provisionParameters object
param userAssignedIdentityId string

var resourceBaseName = provisionParameters.resourceBaseName
var serverfarmsName = contains(provisionParameters, 'webAppServerfarmsName') ? provisionParameters['webAppServerfarmsName'] : '${resourceBaseName}{{scenarioInLowerCase}}' // Try to read name for App Service Plan from parameters
var webAppSKU = contains(provisionParameters, 'webAppSKU') ? provisionParameters['webAppSKU'] : 'F1' // Try to read SKU for Azure Web App from parameters
var webAppName = contains(provisionParameters, 'webAppSitesName') ? provisionParameters['webAppSitesName'] : '${resourceBaseName}{{scenarioInLowerCase}}' // Try to read name for Azure Web App from parameters

// Compute resources for your Web App
resource serverfarm 'Microsoft.Web/serverfarms@2021-02-01' = {
  kind: 'app'
  location: resourceGroup().location
  name: serverfarmsName
  sku: {
    name: webAppSKU
  }
}

// Web App that hosts your app
resource webApp 'Microsoft.Web/sites@2021-02-01' = {
  kind: 'app'
  location: resourceGroup().location
  name: webAppName
  properties: {
    serverFarmId: serverfarm.id
    siteConfig: {
      appSettings: [
        {{#if (contains "node" configs)}}
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~14' // Set NodeJS version to 14.x for your site
        }
        {
          name: 'SCM_SCRIPT_GENERATOR_ARGS'
          value: '--node' // Register as node server
        }
        {
          name: 'RUNNING_ON_AZURE'
          value: '1'
        }
        {{else}}
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {{/if}}
      ]
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {} // The identity is used to access other Azure resources
    }
  }
}

output skuName string = webAppSKU
output siteName string = webAppName
output domain string = webApp.properties.defaultHostName
output appServicePlanName string = serverfarmsName
output resourceId string = webApp.id
output siteEndpoint string = 'https://${webApp.properties.defaultHostName}'
