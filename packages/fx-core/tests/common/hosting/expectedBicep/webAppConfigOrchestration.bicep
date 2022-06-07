// Get existing app settings for merge
var botCurrentAppSettings = list('${provisionOutputs.webAppOutput.value.resourceId}/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Bot resources
module teamsFxBotConfig './teamsFx/webapp.bicep' = {
  name: 'addTeamsFxBotConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: botCurrentAppSettings
  }
}
