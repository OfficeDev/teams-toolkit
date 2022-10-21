@secure()
param provisionParameters object
param provisionOutputs object

// Get existing app settings for merge
var functionBotCurrentConfigs = reference('${ provisionOutputs.azureFunctionBotOutput.value.functionAppResourceId }/config/web', '2021-02-01')
var functionBotCurrentAppSettings = list('${ provisionOutputs.azureFunctionBotOutput.value.functionAppResourceId }/config/appsettings', '2021-02-01').properties

// Merge TeamsFx configurations to Azure Function App
module teamsFxAzureFunctionBotConfig './teamsFx/azureFunctionBotConfig.bicep' = {
  name: 'teamsFxAzureFunctionBotConfig'
  params: {
    provisionParameters: provisionParameters
    provisionOutputs: provisionOutputs
    currentConfigs: functionBotCurrentConfigs
    currentAppSettings: functionBotCurrentAppSettings
  }
}