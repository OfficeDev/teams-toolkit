// Resources for bot
module botProvision '{{PluginOutput.fx-resource-bot.Modules.botProvision.ProvisionPath}}' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.identityResourceId
  }
}

output botOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  webAppEndpoint: botProvision.outputs.webAppEndpoint
  webAppResourceId: botProvision.outputs.webAppResourceId
  webAppHostName: botProvision.outputs.webAppHostName
}
