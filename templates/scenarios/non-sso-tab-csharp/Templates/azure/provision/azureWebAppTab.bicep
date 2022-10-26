@secure()
param provisionParameters object
param userAssignedIdentityId string

var resourceBaseName = provisionParameters.resourceBaseName
var serverfarmsName = contains(provisionParameters, 'webAppServerfarmsName') ? provisionParameters['webAppServerfarmsName'] : '${resourceBaseName}tab' // Try to read name for App Service Plan from parameters
var webAppSKU = contains(provisionParameters, 'webAppSKU') ? provisionParameters['webAppSKU'] : 'F1' // Try to read SKU for Azure Web App from parameters
var webAppName = contains(provisionParameters, 'webAppSitesName') ? provisionParameters['webAppSitesName'] : '${resourceBaseName}tab' // Try to read name for Azure Web App from parameters

// Compute resources for your Web App
resource serverfarm 'Microsoft.Web/serverfarms@2021-02-01' = {
  kind: 'app'
  location: resourceGroup().location
  name: serverfarmsName
  sku: {
    name: webAppSKU
  }
  properties: {}
}

// Web App that hosts your app
resource webApp 'Microsoft.Web/sites@2021-02-01' = {
  kind: 'app'
  location: resourceGroup().location
  name: webAppName
  properties: {
    serverFarmId: serverfarm.id
    keyVaultReferenceIdentity: userAssignedIdentityId // Use given user assigned identity to access Key Vault
    httpsOnly: true
    siteConfig: {
      appSettings: [
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
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