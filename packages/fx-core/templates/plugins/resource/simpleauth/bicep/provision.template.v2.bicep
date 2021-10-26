// Resources for Simple Auth
module simpleAuthProvision './provision/simpleAuthProvision.bicep' = {
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
