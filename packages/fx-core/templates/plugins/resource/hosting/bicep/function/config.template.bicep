// Get existing app settings for merge
var {{moduleName}}CurrentAppSettings = list('${ provisionOutputs.{{moduleName}}Output.value.resourceId }/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Function resources
module teamsFx{{moduleNameCapitalized}}Config './teamsFx/{{moduleName}}.bicep' = {
  name: 'addTeamsFx{{moduleNameCapitalized}}Configuration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: {{moduleName}}CurrentAppSettings
  }
}
