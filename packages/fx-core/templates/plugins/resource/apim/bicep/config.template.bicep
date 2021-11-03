module teamsFxApimConfig '{{PluginOutput.fx-resource-apim.Modules.apimConfiguration.ConfigPath}}' = {
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
