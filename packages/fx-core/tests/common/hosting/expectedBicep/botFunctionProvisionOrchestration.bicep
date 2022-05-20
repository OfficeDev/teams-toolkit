// Resources for bot
module botFunctionProvision '{{fx-resource-bot.Provision.botFunction.path}}' = {
  name: 'botFunctionProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output botFunctionOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  skuName: functionProvision.outputs.functionSKU
  siteName: functionProvision.outputs.functionName
  validDomain: functionProvision.outputs.domain
  appServicePlanName: functionProvision.outputs.appServicePlanName
  botWebAppResourceId: functionProvision.outputs.functionResourceId
  siteEndpoint: functionProvision.outputs.functionEndpoint
}
