var botCurrentAppSettings = list('${provisionOutputs.botOutput.value.webAppResourceId}/config/appsettings', '2021-01-15').properties

module teamsFxBotConfig './botConfig.result.bicep' = {
  name: 'addTeamsFxBotConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: botCurrentAppSettings
  }
}
