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
    botEndpoint: azureFunctionBotProvision.outputs.functionEndpoint
  }
}

// Resources Azure Function App
module azureFunctionBotProvision './provision/azureFunctionBot.bicep' = {
  name: 'azureFunctionBotProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.identityResourceId
  }
}

output azureFunctionBotOutput object = {
  teamsFxPluginId: 'teams-bot'
  sku: azureFunctionBotProvision.outputs.sku
  appName: azureFunctionBotProvision.outputs.appName
  domain: azureFunctionBotProvision.outputs.domain
  appServicePlanName: azureFunctionBotProvision.outputs.appServicePlanName
  functionAppResourceId: azureFunctionBotProvision.outputs.functionAppResourceId
  functionEndpoint: azureFunctionBotProvision.outputs.functionEndpoint
}

output BotOutput object = {
  domain: azureFunctionBotProvision.outputs.domain
  endpoint: azureFunctionBotProvision.outputs.functionEndpoint
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