// Resources for Azure Functions
module functionProvision '{{PluginOutput.fx-resource-function.Modules.functionConfiguration.ProvisionPath}}' = {
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
