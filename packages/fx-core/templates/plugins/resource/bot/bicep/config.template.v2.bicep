var botCurrentAppSettings = list('${provisionOutputs.botOutput.value.webAppResourceId}/config/appsettings', '2021-01-15').properties

module teamsFxBotConfig './teamsFxConfiguration/teamsFxBotConfiguration.bicep' = {
  name: 'addTeamsFxBotConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: botCurrentAppSettings
  }
}
