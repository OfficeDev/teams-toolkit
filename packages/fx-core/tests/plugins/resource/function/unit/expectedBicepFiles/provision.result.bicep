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
  functionAppId: functionProvision.outputs.functionAppId
  functionEndpoint: functionProvision.outputs.functionEndpoint
}
