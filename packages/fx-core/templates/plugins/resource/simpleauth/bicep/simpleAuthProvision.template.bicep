@secure()
param provisionParameters object
param userAssignedIdentityId string
var resourceBaseName = provisionParameters.resourceBaseName
var sku = contains(provisionParameters, 'simpleAuthSku') ? provisionParameters['simpleAuthSku'] : 'F1'
var serverFarmsName = contains(provisionParameters, 'simpleAuthServerFarmsName') ? provisionParameters['simpleAuthServerFarmsName'] : '${resourceBaseName}simpleAuth'
var webAppName = contains(provisionParameters, 'simpleAuthWebAppName') ? provisionParameters['simpleAuthWebAppName'] : '${resourceBaseName}simpleAuth'
var simpleAuthPackageUri = contains(provisionParameters, 'simpleAuthPackageUri') ? provisionParameters['simpleAuthPackageUri'] : 'https://github.com/OfficeDev/TeamsFx/releases/download/simpleauth@0.1.0/Microsoft.TeamsFx.SimpleAuth_0.1.0.zip'

resource serverFarms 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: serverFarmsName
  location: resourceGroup().location
  sku: {
    name: sku
  }
  kind: 'app'
}

resource webApp 'Microsoft.Web/sites@2021-02-01' = {
  kind: 'app'
  name: webAppName
  location: resourceGroup().location
  properties: {
    serverFarmId: serverFarms.id
    keyVaultReferenceIdentity: userAssignedIdentityId
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
}

resource simpleAuthDeploy 'Microsoft.Web/sites/extensions@2021-02-01' = {
  parent: webApp
  name: 'MSDeploy'
  properties: {
    packageUri: simpleAuthPackageUri
  }
}

output webAppResourceId string = webApp.id
output endpoint string = 'https://${webApp.properties.defaultHostName}'
