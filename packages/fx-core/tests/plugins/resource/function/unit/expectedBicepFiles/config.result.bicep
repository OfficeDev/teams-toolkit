var functionCurrentConfigs = reference('${provisionOutputs.functionOutput.value.functionAppResourceId}/config/web', '2021-01-15')
var functionCurrentAppSettings = list('${provisionOutputs.functionOutput.value.functionAppResourceId}/config/appsettings', '2021-01-15').properties

module teamsFxFunctionConfig './functionConfig.result.bicep' = {
  name: 'addTeamsFxFunctionConfiguration'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentConfigs: functionCurrentConfigs
    currentAppSettings: functionCurrentAppSettings
  }
}
