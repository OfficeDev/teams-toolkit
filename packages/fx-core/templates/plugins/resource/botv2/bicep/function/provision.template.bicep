// Resources for bot
module functionProvision '\{{PluginIdPlaceholder.Provision.function.path}}' = {
  name: 'function.Provision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: \{{fx-resource-identity.References.identityResourceId}}
  }
}

output functionOutput object = {
  teamsFxPluginId: 'PluginIdPlaceholder'
  skuName: functionProvision.outputs.functionSKU
  siteName: functionProvision.outputs.functionName
  validDomain: functionProvision.outputs.domain
  appServicePlanName: functionProvision.outputs.appServicePlanName
  resourceId: functionProvision.outputs.functionResourceId
  siteEndpoint: functionProvision.outputs.functionEndpoint
}
