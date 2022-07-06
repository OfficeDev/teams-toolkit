// Get existing app settings for merge
var currentAppSettings = list('${ {{azure-function.outputs.resourceId}} }/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Azure Function App
module teamsFxAzureFunction{{componentName}}Config './teamsFx/azureFunction{{componentName}}Config.bicep' = {
  name: 'teamsFxAzureFunction{{componentName}}Config'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: currentAppSettings
  }
}
