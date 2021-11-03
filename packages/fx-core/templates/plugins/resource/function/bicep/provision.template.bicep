// Resources for Azure Functions
module functionProvision '{{PluginOutput.fx-resource-function.Modules.functionProvision.ProvisionPath}}' = {
  name: 'functionProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: {{PluginOutput.fx-resource-identity.References.identityResourceId}}
  }
}

output functionOutput object = {
  teamsFxPluginId: 'fx-resource-function'
  functionAppResourceId: functionProvision.outputs.functionAppResourceId
  endpoint: functionProvision.outputs.functionAppEndpoint
}
