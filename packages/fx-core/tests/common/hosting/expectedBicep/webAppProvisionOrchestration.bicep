// Resources for bot
module webAppProvision './provision/webapp.bicep' = {
  name: 'webAppProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: {{fx-resource-identity.References.identityResourceId}}
  }
}

output webAppOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  skuName: webAppProvision.outputs.webAppSKU
  siteName: webAppProvision.outputs.webAppName
  validDomain: webAppProvision.outputs.webAppDomain
  appServicePlanName: webAppProvision.outputs.appServicePlanName
  resourceId: webAppProvision.outputs.webAppResourceId
  siteEndpoint: webAppProvision.outputs.webAppEndpoint
}
