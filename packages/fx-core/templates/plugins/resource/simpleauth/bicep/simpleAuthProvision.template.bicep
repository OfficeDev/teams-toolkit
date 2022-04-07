@secure()
param provisionParameters object
param userAssignedIdentityId string
var resourceBaseName = provisionParameters.resourceBaseName
var sku = contains(provisionParameters, 'simpleAuthSku') ? provisionParameters['simpleAuthSku'] : 'F1' // Try to read SKU for App Service Plan from parameters
var serverFarmsName = contains(provisionParameters, 'simpleAuthServerFarmsName') ? provisionParameters['simpleAuthServerFarmsName'] : '${resourceBaseName}simpleAuth' // Try to read name for App Service Plan from parameters
var webAppName = contains(provisionParameters, 'simpleAuthWebAppName') ? provisionParameters['simpleAuthWebAppName'] : '${resourceBaseName}simpleAuth' // Try to read name for Web App from parameters
var simpleAuthPackageUri = contains(provisionParameters, 'simpleAuthPackageUri') ? provisionParameters['simpleAuthPackageUri'] : 'https://github.com/OfficeDev/TeamsFx/releases/download/simpleauth@0.1.0/Microsoft.TeamsFx.SimpleAuth_0.1.0.zip' // Try to read url of Simple Auth bits from parameters

// Compute resources for Web App
resource serverFarms 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: serverFarmsName
  location: resourceGroup().location
  sku: {
    name: sku
  }
  kind: 'app'
}

// Web App that hosts Simple Auth
resource webApp 'Microsoft.Web/sites@2021-02-01' = {
  kind: 'app'
  name: webAppName
  location: resourceGroup().location
  properties: {
    serverFarmId: serverFarms.id
    keyVaultReferenceIdentity: userAssignedIdentityId // Use given user assigned identity to access Key Vault
    httpsOnly: true
    siteConfig:{
      ftpsState: 'FtpsOnly'
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {} // The identity is used to access other Azure resources
    }
  }
}

// Deploy Simple Auth bits to Web App
resource simpleAuthDeploy 'Microsoft.Web/sites/extensions@2021-02-01' = {
  parent: webApp
  name: 'MSDeploy'
  properties: {
    packageUri: simpleAuthPackageUri
  }
}

output webAppResourceId string = webApp.id
output endpoint string = 'https://${webApp.properties.defaultHostName}'
