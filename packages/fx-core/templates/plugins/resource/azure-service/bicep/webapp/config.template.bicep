// Get existing app settings for merge
var botCurrentAppSettings = list('${provisionOutputs.webAppOutput.value.botWebAppResourceId}/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Bot resources
module teamsFxBotConfig '\{{PluginIdPlaceholder.Configuration.webapp.path}}' = {
  name: 'addTeamsFxBotConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: botCurrentAppSettings
  }
}
