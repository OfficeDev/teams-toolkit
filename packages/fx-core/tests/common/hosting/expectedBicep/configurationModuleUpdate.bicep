// Get existing app settings for merge
var botCurrentAppSettings = list('${provisionOutputs.webAppOutput.value.webAppResourceId}/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Bot resources
module teamsFxBotConfig '{{fx-resource-bot.Configuration.webapp.path}}' = {
  name: 'addTeamsFxBotConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: botCurrentAppSettings
  }
}
