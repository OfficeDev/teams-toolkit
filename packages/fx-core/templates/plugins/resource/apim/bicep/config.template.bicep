module teamsFxApimConfig '{{Plugins.fx-resource-apim.Configuration.apim.ConfigPath}}' = {
  name: 'addTeamsFxApimConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
  }
}

output apimConfigOutput object = {
  teamsFxPluginId: 'fx-resource-apim'
  authServerResourceId: teamsFxApimConfig.outputs.authServerResourceId
}
