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
  skuName: botFunctionProvision.outputs.functionSKU
  siteName: botFunctionProvision.outputs.functionName
  validDomain: botFunctionProvision.outputs.domain
  appServicePlanName: botFunctionProvision.outputs.appServicePlanName
  botWebAppResourceId: botFunctionProvision.outputs.functionResourceId
  siteEndpoint: botFunctionProvision.outputs.functionEndpoint
}
