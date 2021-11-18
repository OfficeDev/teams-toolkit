// Resources for Simple Auth
module simpleAuthProvision './simpleAuthProvision.result.bicep' = {
  name: 'simpleAuthProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: 
  }
}

output simpleAuthOutput object = {
  teamsFxPluginId: 'fx-resource-simple-auth'
  endpoint: simpleAuthProvision.outputs.endpoint
  webAppResourceId: simpleAuthProvision.outputs.webAppResourceId
}
