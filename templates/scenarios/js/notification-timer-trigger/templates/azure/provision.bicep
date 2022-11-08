@secure()
param provisionParameters object

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