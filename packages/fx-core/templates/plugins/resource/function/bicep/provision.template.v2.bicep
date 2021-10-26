// Resources for Azure Functions
module functionProvision './provision/functionProvision.bicep' = {
  name: 'functionProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.resourceId
  }
}

output functionOutput object = {
  teamsFxPluginId: 'fx-resource-function'
  functionAppResourceId: functionProvision.outputs.functionAppResourceId
  endpoint: functionProvision.outputs.functionAppEndpoint
}
