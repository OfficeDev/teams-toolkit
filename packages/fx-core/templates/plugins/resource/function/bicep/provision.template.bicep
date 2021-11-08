// Resources for Azure Functions
module functionProvision '{{PluginOutput.fx-resource-function.Provision.function.ProvisionPath}}' = {
  name: 'functionProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: {{PluginOutput.fx-resource-identity.References.identityResourceId}}
  }
}

output functionOutput object = {
  teamsFxPluginId: 'fx-resource-function'
  functionAppId: functionProvision.outputs.functionAppId
  functionEndpoint: functionProvision.outputs.functionEndpoint
}
