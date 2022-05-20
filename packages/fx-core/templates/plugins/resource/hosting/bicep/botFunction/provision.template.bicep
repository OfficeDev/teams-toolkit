// Resources for bot
module botFunctionProvision '\{{PluginIdPlaceholder.Provision.botFunction.path}}' = {
  name: 'botFunctionProvision'
  params: {
    provisionParameters: provisionParameters
    {{#if (contains "fx-resource-identity" plugins)}}
    userAssignedIdentityId: \{{fx-resource-identity.References.identityResourceId}}
    {{/if}}
  }
}

output botFunctionOutput object = {
  teamsFxPluginId: 'PluginIdPlaceholder'
  skuName: functionProvision.outputs.functionSKU
  siteName: functionProvision.outputs.functionName
  validDomain: functionProvision.outputs.domain
  appServicePlanName: functionProvision.outputs.appServicePlanName
  botWebAppResourceId: functionProvision.outputs.functionResourceId
  siteEndpoint: functionProvision.outputs.functionEndpoint
}
