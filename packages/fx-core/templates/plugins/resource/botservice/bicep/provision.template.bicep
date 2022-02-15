// Resources for bot
module botProvision '\{{fx-resource-bot.Provision.botservice.path}}' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    botEndpoint: \{{fx-resource-frontend-hosting.References.endpointAsParam}}
  }
}

output botOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  validDomain: \{{fx-resource-frontend-hosting.References.domainAsParam}}
}
