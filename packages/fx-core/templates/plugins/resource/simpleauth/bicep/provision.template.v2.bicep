// Resources for Simple Auth
module simpleAuthProvision '{{PluginOutput.fx-resource-simple-auth.Modules.simpleAuthProvision.Path}}' = {
  name: 'simpleAuthProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output simpleAuthOutput object = {
  teamsFxPluginId: 'fx-resource-simple-auth'
  endpoint: simpleAuthProvision.outputs.endpoint
  webAppResourceId: simpleAuthProvision.outputs.webAppResourceId
}
