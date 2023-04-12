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
