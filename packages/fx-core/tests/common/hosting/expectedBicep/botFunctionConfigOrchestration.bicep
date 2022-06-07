// Get existing app settings for merge
var botFunctionCurrentAppSettings = list('${ provisionOutputs.botFunctionOutput.value.resourceId }/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Function resources
module teamsFxBotFunctionConfig './teamsFx/botFunction.bicep' = {
  name: 'addTeamsFxBotFunctionConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: botFunctionCurrentAppSettings
  }
}
