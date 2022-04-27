// Resources for bot
module functionProvision '{{fx-resource-bot.Provision.function.path}}' = {
  name: 'function.Provision'
  params: {
    provisionParameters: provisionParameters
  }
}

output functionOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  skuName: functionProvision.outputs.functionSKU
  siteName: functionProvision.outputs.functionName
  validDomain: functionProvision.outputs.domain
  appServicePlanName: functionProvision.outputs.appServicePlanName
  resourceId: functionProvision.outputs.functionResourceId
  siteEndpoint: functionProvision.outputs.functionEndpoint
}
