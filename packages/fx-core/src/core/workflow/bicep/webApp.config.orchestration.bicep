@secure()
param provisionParameters object
param provisionOutputs object
// Get existing app settings for merge
var currentAppSettings = list('${provisionOutputs.webAppOutput.value.webAppResourceId}/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Bot resources
module teamsFxWebAppConfig './webApp.config.module.bicep' = {
  name: 'addTeamsFxWebAppConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: currentAppSettings
  }
}
