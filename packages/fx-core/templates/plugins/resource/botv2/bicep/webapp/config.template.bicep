// Get existing app settings for merge
var currentAppSettings = list('${provisionOutputs.webAppOutput.value.webAppResourceId}/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Bot resources
module teamsFxwebAppConfig '\{{fx-resource-bot.Configuration.webApp.path}}' = {
  name: 'addTeamsFxwebAppConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: currentAppSettings
  }
}
