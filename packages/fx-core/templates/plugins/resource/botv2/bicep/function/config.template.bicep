// Get existing app settings for merge
var botCurrentAppSettings = list('${provisionOutputs.functionOutput.value.botFunctionResourceId}/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Bot resources
module teamsFxBotConfig '\{{fx-resource-bot.Configuration.function.path}}' = {
  name: 'addTeamsFxBotConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: botCurrentAppSettings
  }
}
