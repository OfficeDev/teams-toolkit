// Merge TeamsFx configurations to Bot service
module teamsFxBotServiceConfig '{{bot-service.Configuration.botService.path}}' = {
  name: 'teamsFxBotServiceConfig'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
  }
}
