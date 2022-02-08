var webappCurrentAppSettings = list('${provisionOutputs.webappOutput.value.webAppResourceId}/config/appsettings', '2021-02-01').properties

module teamsFxWebappConfig '\{{fx-resource-aspdnet.Configuration.webapp.path}}' = {
  name: 'addTeamsFxWebappConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: webappCurrentAppSettings
  }
}
