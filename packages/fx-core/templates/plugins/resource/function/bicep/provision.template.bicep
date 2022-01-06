// Resources for Azure Functions
module functionProvision '\{{fx-resource-function.Provision.function.path}}' = {
  name: 'functionProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: \{{fx-resource-identity.References.identityResourceId}}
  }
}

output functionOutput object = {
  teamsFxPluginId: 'fx-resource-function'
  functionAppResourceId: functionProvision.outputs.functionAppResourceId
  functionEndpoint: functionProvision.outputs.functionEndpoint
}
