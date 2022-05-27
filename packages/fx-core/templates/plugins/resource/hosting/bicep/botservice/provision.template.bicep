// Resources for bot
module botProvision '\{{fx-resource-bot.Provision.botservice.path}}' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    botEndpoint: \{{fx-resource-bot.References.endpointAsParam}}
  }
}
