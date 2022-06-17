// Resources for bot
module webAppProvision './provision/webapp.bicep' = {
  name: 'webAppProvision'
  params: {
    provisionParameters: provisionParameters
    {{#if (contains "fx-resource-identity" plugins)}}
    userAssignedIdentityId: \{{fx-resource-identity.References.identityResourceId}}
    {{/if}}
  }
}

output webAppOutput object = {
  teamsFxPluginId: '{{pluginId}}'
  skuName: webAppProvision.outputs.webAppSKU
  siteName: webAppProvision.outputs.webAppName
  validDomain: webAppProvision.outputs.webAppDomain
  appServicePlanName: webAppProvision.outputs.appServicePlanName
  resourceId: webAppProvision.outputs.webAppResourceId
  siteEndpoint: webAppProvision.outputs.webAppEndpoint
}
