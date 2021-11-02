var botCurrentAppSettings = list('${provisionOutputs.botOutput.value.webAppResourceId}/config/appsettings', '2021-01-15').properties

module teamsFxBotConfig '{{PluginOutput.fx-resource-bot.Modules.botConfiguration.ConfigPath}}' = {
  name: 'addTeamsFxBotConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: botCurrentAppSettings
  }
}
