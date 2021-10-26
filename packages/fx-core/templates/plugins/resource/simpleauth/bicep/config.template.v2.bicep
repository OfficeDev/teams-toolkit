var simpleAuthCurrentAppSettings = list('${provisionOutputs.simpleAuthOutput.value.webAppResourceId}/config/appsettings', '2021-01-15').properties

module teamsFxSimpleAuthConfig './teamsFxConfiguration/teamsFxSimpleAuthConfiguration.bicep' = {
  name: 'addTeamsFxSimpleAuthConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: simpleAuthCurrentAppSettings
  }
}
