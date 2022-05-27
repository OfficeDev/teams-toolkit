// Get existing app settings for merge
var currentAppSettings = list('${provisionOutputs.azureWebAppOutput.value.resourceId}/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Bot resources
module teamsFxAzureWebAppConfig './teamsFx/azureWebAppConfig.bicep' = {
  name: 'teamsFxAzureWebAppConfig'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: currentAppSettings
  }
}
