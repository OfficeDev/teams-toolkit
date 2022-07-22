// Get existing app settings for merge
var function{{scenario}}CurrentConfigs = reference('${ provisionOutputs.azureFunction{{scenario}}Output.value.functionAppResourceId }/config/web', '2021-02-01')
var function{{scenario}}CurrentAppSettings = list('${ provisionOutputs.azureFunction{{scenario}}Output.value.functionAppResourceId }/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Azure Function App
module teamsFxAzureFunction{{scenario}}Config './teamsFx/azureFunction{{scenario}}Config.bicep' = {
  name: 'teamsFxAzureFunction{{scenario}}Config'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentConfigs: function{{scenario}}CurrentConfigs
    currentAppSettings: function{{scenario}}CurrentAppSettings
  }
}
