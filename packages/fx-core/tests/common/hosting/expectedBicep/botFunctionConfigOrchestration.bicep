// Get existing app settings for merge
var functionCurrentAppSettings = list('${provisionOutputs.botFunctionOutput.value.botWebAppesourceId}/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Function resources
module teamsFxBotFunctionConfig '{{fx-resource-bot.Configuration.botFunction.path}}' = {
  name: 'addTeamsFxBotFunctionConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: functionCurrentAppSettings
  }
}
