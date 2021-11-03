// Resources for Azure Functions
module functionProvision './functionProvision.result.bicep' = {
  name: 'functionProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.identityResourceId
  }
}

output functionOutput object = {
  teamsFxPluginId: 'fx-resource-function'
  functionAppResourceId: functionProvision.outputs.functionAppResourceId
  endpoint: functionProvision.outputs.functionAppEndpoint
}
