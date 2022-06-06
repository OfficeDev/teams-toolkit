@secure()
param provisionParameters object
param userAssignedIdentityId string

var resourceBaseName = provisionParameters.resourceBaseName
var serverfarmsName = contains(provisionParameters, 'botServerfarmsName') ? provisionParameters['botServerfarmsName'] : '${resourceBaseName}bot' // Try to read name for App Service Plan from parameters
var webAppSKU = contains(provisionParameters, 'botWebAppSKU') ? provisionParameters['botWebAppSKU'] : 'B1' // Try to read SKU for Azure Web App from parameters
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
    keyVaultReferenceIdentity: userAssignedIdentityId // Use given user assigned identity to access Key Vault
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
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
        {{else}}
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true' // Execute build steps on your site during deployment
        }
        {{/if}}
        {
          name: 'RUNNING_ON_AZURE'
          value: '1'
        }
      ]
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

output webAppSKU string = webAppSKU
output webAppName string = webAppName
output webAppDomain string = webApp.properties.defaultHostName
output appServicePlanName string = serverfarmsName
output webAppResourceId string = webApp.id
output webAppEndpoint string = 'https://${webApp.properties.defaultHostName}'
