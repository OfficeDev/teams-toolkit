// Add TeamsFx configurations to APIM resources
module teamsFxApimConfig './apimConfiguration.result.bicep' = {
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
