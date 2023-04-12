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