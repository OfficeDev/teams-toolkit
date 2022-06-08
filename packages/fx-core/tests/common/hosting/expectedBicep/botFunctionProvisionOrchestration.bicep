module botFunctionProvision './provision/botFunction.bicep' = {
  name: 'botFunctionProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output botFunctionOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  skuName: botFunctionProvision.outputs.functionSKU
  siteName: botFunctionProvision.outputs.functionName
  validDomain: botFunctionProvision.outputs.domain
  appServicePlanName: botFunctionProvision.outputs.appServicePlanName
  resourceId: botFunctionProvision.outputs.functionResourceId
  siteEndpoint: botFunctionProvision.outputs.functionEndpoint
}
