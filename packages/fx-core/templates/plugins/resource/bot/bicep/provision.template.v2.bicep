// Resources for bot
module botProvision './provision/botProvision.bicep' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.resourceId
  }
}

output botOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  webAppEndpoint: botProvision.outputs.webAppEndpoint
  webAppResourceId: botProvision.outputs.webAppResourceId
  webAppHostName: botProvision.outputs.webAppHostName
}
