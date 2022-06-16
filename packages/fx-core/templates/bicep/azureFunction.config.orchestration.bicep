// Get existing app settings for merge
var currentAppSettings = list('${provisionOutputs.azureFunctionOutput.value.resourceId}/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Azure Function App
module teamsFxAzureFunctionConfig './teamsFx/azureFunctionConfig.bicep' = {
  name: 'teamsFxAzureFunctionConfig'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: currentAppSettings
  }
}
