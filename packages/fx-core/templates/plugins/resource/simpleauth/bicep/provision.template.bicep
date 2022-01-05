// Resources for Simple Auth
module simpleAuthProvision '\{{fx-resource-simple-auth.Provision.simpleAuth.path}}' = {
  name: 'simpleAuthProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: \{{fx-resource-identity.References.identityResourceId}}
  }
}

output simpleAuthOutput object = {
  teamsFxPluginId: 'fx-resource-simple-auth'
  endpoint: simpleAuthProvision.outputs.endpoint
  webAppResourceId: simpleAuthProvision.outputs.webAppResourceId
}
