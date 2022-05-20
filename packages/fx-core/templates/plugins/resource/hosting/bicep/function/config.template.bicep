// Get existing app settings for merge
var botFunctionCurrentAppSettings = list('${provisionOutputs.botFunctionOutput.value.botWebAppResourceId}/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Function resources
module teamsFxBotFunctionConfig '\{{PluginIdPlaceholder.Configuration.botFunction.path}}' = {
  name: 'addTeamsFxBotFunctionConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: botFunctionCurrentAppSettings
  }
}
