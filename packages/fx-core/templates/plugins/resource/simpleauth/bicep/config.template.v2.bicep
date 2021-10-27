var simpleAuthCurrentAppSettings = list('${provisionOutputs.simpleAuthOutput.value.webAppResourceId}/config/appsettings', '2021-01-15').properties

module teamsFxSimpleAuthConfig '{{PluginOutput.fx-resource-simple-auth.Modules.simpleAuthConfiguration.Path}}' = {
  name: 'addTeamsFxSimpleAuthConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: simpleAuthCurrentAppSettings
  }
}
