// Get existing app settings for merge
var currentAppSettings = list('${ {{azure-web-app.outputs.resourceId}} }/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Bot resources
module teamsFxAzureWebApp{{componentName}}Config './teamsFx/azureWebApp{{componentName}}Config.bicep' = {
  name: 'teamsFxAzureWebApp{{componentName}}Config'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentAppSettings: currentAppSettings
  }
}
