// Resources for bot
module functionProvision '\{{fx-resource-bot.Provision.function.path}}' = {
  name: 'function.Provision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: \{{fx-resource-identity.References.identityResourceId}}
  }
}

output functionOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  skuName: functionProvision.outputs.botFunctionSKU
  siteName: functionProvision.outputs.botFunctionName
  validDomain: functionProvision.outputs.botDomain
  appServicePlanName: functionProvision.outputs.appServicePlanName
  botFunctionResourceId: functionProvision.outputs.botFunctionResourceId
  siteEndpoint: functionProvision.outputs.botFunctionEndpoint
}
