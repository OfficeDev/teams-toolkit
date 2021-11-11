// Resources for bot
module botProvision '{{PluginOutput.fx-resource-bot.Provision.bot.ProvisionPath}}' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: {{PluginOutput.fx-resource-identity.References.identityResourceId}}
  }
}

output botOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  skuName: botProvision.outputs.botWebAppSKU
  siteName: botProvision.outputs.botWebAppName
  validDomain: botProvision.outputs.botDomain
  appServicePlanName: botProvision.outputs.appServicePlanName
  botChannelRegName: botProvision.outputs.botServiceName
  botWebAppResourceId: botProvision.outputs.botWebAppResourceId
  siteEndpoint: botProvision.outputs.botWebAppEndpoint
}
