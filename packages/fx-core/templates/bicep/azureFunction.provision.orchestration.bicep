// Resources Azure Function App
module azureFunctionProvision './provision/azureFunction.bicep' = {
  name: 'azureFunctionProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output azureFunctionOutput object = {
  teamsFxPluginId: 'azure-function'
  sku: azureFunctionProvision.outputs.sku
  appName: azureFunctionProvision.outputs.appName
  domain: azureFunctionProvision.outputs.domain
  appServicePlanName: azureFunctionProvision.outputs.appServicePlanName
  resourceId: azureFunctionProvision.outputs.resourceId
  endpoint: azureFunctionProvision.outputs.endpoint
}
