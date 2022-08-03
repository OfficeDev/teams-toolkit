// Get existing app settings for merge
var currentAppSettings = list('${ provisionOutputs.azureWebApp{{scenario}}Output.value.resourceId }/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Bot resources
module teamsFxAzureWebApp{{scenario}}Config './teamsFx/azureWebApp{{scenario}}Config.bicep' = {
  name: 'teamsFxAzureWebApp{{scenario}}Config'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: currentAppSettings
  }
}
