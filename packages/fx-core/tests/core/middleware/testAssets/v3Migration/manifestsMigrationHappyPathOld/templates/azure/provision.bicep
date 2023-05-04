@secure()
param provisionParameters object

// Resources for frontend hosting
module azureStorageTabProvision './provision/azureStorageTab.bicep' = {
  name: 'azureStorageTabProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output azureStorageTabOutput object = {
  teamsFxPluginId: 'teams-tab'
  domain: azureStorageTabProvision.outputs.domain
  endpoint: azureStorageTabProvision.outputs.endpoint
  indexPath: azureStorageTabProvision.outputs.indexPath
  storageResourceId: azureStorageTabProvision.outputs.storageResourceId
}


output TabOutput object = {
  domain: azureStorageTabProvision.outputs.domain
  endpoint: azureStorageTabProvision.outputs.endpoint
}

// Resources for identity
module userAssignedIdentityProvision './provision/identity.bicep' = {
  name: 'userAssignedIdentityProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output identityOutput object = {
  teamsFxPluginId: 'identity'
  identityName: userAssignedIdentityProvision.outputs.identityName
  identityResourceId: userAssignedIdentityProvision.outputs.identityResourceId
  identityClientId: userAssignedIdentityProvision.outputs.identityClientId
}

// Merge TeamsFx configurations to Bot service
module botProvision './provision/botService.bicep' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    botEndpoint: azureWebAppBotProvision.outputs.siteEndpoint
  }
}

// Resources web app
module azureWebAppBotProvision './provision/azureWebAppBot.bicep' = {
  name: 'azureWebAppBotProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.identityResourceId
  }
}


output azureWebAppBotOutput object = {
  teamsFxPluginId: 'teams-bot'
  skuName: azureWebAppBotProvision.outputs.skuName
  siteName: azureWebAppBotProvision.outputs.siteName
  domain: azureWebAppBotProvision.outputs.domain
  appServicePlanName: azureWebAppBotProvision.outputs.appServicePlanName
  resourceId: azureWebAppBotProvision.outputs.resourceId
  siteEndpoint: azureWebAppBotProvision.outputs.siteEndpoint
}

output BotOutput object = {
  domain: azureWebAppBotProvision.outputs.domain
  endpoint: azureWebAppBotProvision.outputs.siteEndpoint
}

// Resources Azure Function App
module azureFunctionApiProvision './provision/azureFunctionApi.bicep' = {
  name: 'azureFunctionApiProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.identityResourceId
  }
}

output azureFunctionApiOutput object = {
  teamsFxPluginId: 'teams-api'
  sku: azureFunctionApiProvision.outputs.sku
  appName: azureFunctionApiProvision.outputs.appName
  domain: azureFunctionApiProvision.outputs.domain
  appServicePlanName: azureFunctionApiProvision.outputs.appServicePlanName
  functionAppResourceId: azureFunctionApiProvision.outputs.functionAppResourceId
  functionEndpoint: azureFunctionApiProvision.outputs.functionEndpoint
}

output ApiOutput object = {
  domain: azureFunctionApiProvision.outputs.domain
  endpoint: azureFunctionApiProvision.outputs.functionEndpoint
}

// Resources for Azure SQL
module azureSqlProvision './provision/azureSql.bicep' = {
  name: 'azureSqlProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output azureSqlOutput object = {
  teamsFxPluginId: 'azure-sql'
  sqlResourceId: azureSqlProvision.outputs.sqlResourceId
  sqlEndpoint: azureSqlProvision.outputs.sqlEndpoint
  databaseName: azureSqlProvision.outputs.sqlDatabaseName
}

// output for database with name suffix [b4cf24]
output azureSqlOutput_b4cf24 object = {
  teamsFxPluginId: 'azure-sql'
  databaseName_b4cf24: azureSqlProvision.outputs.databaseName_b4cf24
}

// Resources for APIM
module apimProvision './provision/apim.bicep'  = {
  name: 'apimProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output apimOutput object = {
  teamsFxPluginId: 'apim'
  serviceResourceId: apimProvision.outputs.serviceResourceId
  productResourceId: apimProvision.outputs.productResourceId
}

// Resources for Azure Key Vault
module keyVaultProvision './provision/keyVault.bicep' = {
  name: 'keyVaultProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityObjectId: userAssignedIdentityProvision.outputs.identityPrincipalId
  }
}

output keyVaultOutput object = {
  teamsFxPluginId: 'key-vault'
  keyVaultResourceId: keyVaultProvision.outputs.keyVaultResourceId
  m365ClientSecretReference: keyVaultProvision.outputs.m365ClientSecretReference
  botClientSecretReference: keyVaultProvision.outputs.botClientSecretReference
}
