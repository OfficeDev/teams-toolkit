// Add TeamsFx configurations to APIM resources
module teamsFxApimConfig '\{{fx-resource-apim.Configuration.apim.path}}' = {
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
