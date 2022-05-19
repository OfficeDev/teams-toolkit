// Resources for bot
module webAppProvision '{{fx-resource-bot.Provision.webapp.path}}' = {
  name: 'webApp.Provision'
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
  webAppResourceId: webAppProvision.outputs.webAppResourceId
  siteEndpoint: webAppProvision.outputs.webAppEndpoint
}
