@secure()
param provisionParameters object
param userAssignedIdentityId string

var resourceBaseName = provisionParameters.resourceBaseName
var serverfarmsName = contains(provisionParameters, 'webAppServerfarmsName') ? provisionParameters['webAppServerfarmsName'] : '${resourceBaseName}{{scenarioInLowerCase}}' // Try to read name for App Service Plan from parameters
{{#if (equals "Bot" scenario)}}
var webAppSKU = contains(provisionParameters, 'webAppSKU') ? provisionParameters['webAppSKU'] : 'B1' // Try to read SKU for Azure Web App from parameters
{{else}}
var webAppSKU = contains(provisionParameters, 'webAppSKU') ? provisionParameters['webAppSKU'] : 'F1' // Try to read SKU for Azure Web App from parameters
{{/if}}
var webAppName = contains(provisionParameters, 'webAppSitesName') ? provisionParameters['webAppSitesName'] : '${resourceBaseName}{{scenarioInLowerCase}}' // Try to read name for Azure Web App from parameters

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
      {{#if (equals "Bot" scenario)}}
      alwaysOn: true
      {{/if}}
      appSettings: [
        {{#if (contains "node" configs)}}
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~16' // Set NodeJS version to 16.x for your site
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
          {{#if (equals "Tab" scenario)}}
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
          {{else}}
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true' // Execute build steps on your site during deployment
        }
        {
          name: 'RUNNING_ON_AZURE'
          value: '1'
        }
          {{/if}}
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
