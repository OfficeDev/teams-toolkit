// Resources for bot
module botProvision '\{{fx-resource-bot.Provision.bot.path}}' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: \{{fx-resource-identity.References.identityResourceId}}
  }
}

output botOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  skuName: botProvision.outputs.botWebAppSKU
  siteName: botProvision.outputs.botWebAppName
  validDomain: botProvision.outputs.botDomain
  appServicePlanName: botProvision.outputs.appServicePlanName
  botWebAppResourceId: botProvision.outputs.botWebAppResourceId
  siteEndpoint: botProvision.outputs.botWebAppEndpoint
}
