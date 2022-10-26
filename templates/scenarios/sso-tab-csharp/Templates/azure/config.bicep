@secure()
param provisionParameters object
param provisionOutputs object

// Get existing app settings for merge
var currentAppSettings = list('${ provisionOutputs.azureWebAppTabOutput.value.resourceId }/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Bot resources
module teamsFxAzureWebAppTabConfig './teamsFx/azureWebAppTabConfig.bicep' = {
  name: 'teamsFxAzureWebAppTabConfig'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: currentAppSettings
  }
}