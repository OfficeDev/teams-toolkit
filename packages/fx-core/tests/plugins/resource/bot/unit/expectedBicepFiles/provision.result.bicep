// Resources for bot
module botProvision './botProvision.result.bicep' = {
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
