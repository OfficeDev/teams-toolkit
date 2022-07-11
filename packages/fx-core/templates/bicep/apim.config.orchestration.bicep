// Add TeamsFx configurations to APIM resources
module teamsFxApimConfig './teamsFx/apimConfig.bicep' = {
  name: 'teamsFxApimConfig'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
  }
}

output apimConfigOutput object = {
  teamsFxPluginId: 'apim'
  authServerResourceId: teamsFxApimConfig.outputs.authServerResourceId
}
