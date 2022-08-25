@secure()
param provisionParameters object
param userAssignedIdentityId string

var resourceBaseName = provisionParameters.resourceBaseName
var serverFarmsName = contains(provisionParameters, 'webappServerfarmsName') ? provisionParameters['webappServerfarmsName'] : '${resourceBaseName}webapp'
var sku = contains(provisionParameters, 'webappServerfarmsSku') ? provisionParameters['webappServerfarmsSku'] : 'F1'
var webAppName = contains(provisionParameters, 'webappWebappName') ? provisionParameters['webappWebappName'] : '${resourceBaseName}webapp'

resource serverFarms 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: serverFarmsName
  location: resourceGroup().location
  sku: {
    name: sku
  }
  kind: 'app'
  properties: {}
}

resource webApp 'Microsoft.Web/sites@2021-02-01' = {
  kind: 'app'
  name: webAppName
  location: resourceGroup().location
  properties: {
    serverFarmId: serverFarms.id
    keyVaultReferenceIdentity: userAssignedIdentityId
    httpsOnly: true
    siteConfig: {
      appSettings: [
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
      ftpsState: 'FtpsOnly'
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
}

var siteDomain = webApp.properties.defaultHostName

output resourceId string = webApp.id
output endpoint string = 'https://${siteDomain}'
output domain string = siteDomain
output indexPath string = ''
