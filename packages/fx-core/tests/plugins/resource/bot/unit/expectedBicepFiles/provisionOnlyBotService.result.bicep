// Resources for bot
module botProvision './botServiceProvision.result.bicep' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    botEndpoint: webappProvision.outputs.endpoint
  }
}

output botOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  validDomain: webappProvision.outputs.domain
}
