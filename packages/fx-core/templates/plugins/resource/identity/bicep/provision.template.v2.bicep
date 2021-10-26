module userAssignedIdentityProvision '{{PluginOutput.fx-resource-identity.Modules.identityProvision.ProvisionPath}}' = {
  name: 'userAssignedIdentityProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output identityOutput object = {
  teamsFxPluginId: 'fx-resource-identity'
  resourceId: {{PluginOutput.fx-resource-identity.Modules.identityProvision.References.identityResourceId}}
  clientId: {{PluginOutput.fx-resource-identity.Modules.identityProvision.References.identityClientId}}
}
