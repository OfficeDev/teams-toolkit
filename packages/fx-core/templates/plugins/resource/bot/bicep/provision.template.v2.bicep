// Resources for bot
module botProvision '{{PluginOutput.fx-resource-bot.Provision.bot.ProvisionPath}}' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: {{PluginOutput.fx-resource-identity.References.identityResourceId}}
  }
}

output botOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  webAppEndpoint: botProvision.outputs.webAppEndpoint
  webAppResourceId: botProvision.outputs.webAppResourceId
  webAppHostName: botProvision.outputs.webAppHostName
}
