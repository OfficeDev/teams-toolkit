// Resources for Simple Auth
module simpleAuthProvision '{{Plugins.fx-resource-simple-auth.Provision.simpleAuth.ProvisionPath}}' = {
  name: 'simpleAuthProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: {{Plugins.fx-resource-identity.References.identityResourceId}}
  }
}

output simpleAuthOutput object = {
  teamsFxPluginId: 'fx-resource-simple-auth'
  endpoint: simpleAuthProvision.outputs.endpoint
  webAppResourceId: simpleAuthProvision.outputs.webAppResourceId
}
