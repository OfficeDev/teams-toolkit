// Merge TeamsFx configurations to Bot service
module teamsFxBotServiceConfig './teamsFx/botService.bicep' = {
  name: 'teamsFxBotServiceConfig'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
  }
}
