// Get existing app settings for merge
var functionCurrentAppSettings = list('${provisionOutputs.functionOutput.value.resourceId}/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Function resources
module teamsFxFunctionConfig '{{fx-resource-bot.Configuration.function.path}}' = {
  name: 'addTeamsFxFunctionConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: functionCurrentAppSettings
  }
}
