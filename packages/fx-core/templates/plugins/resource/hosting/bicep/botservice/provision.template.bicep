// Resources for bot
module botProvision './provision/botservice.bicep' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    botEndpoint: \{{fx-resource-bot.References.endpointAsParam}}
  }
}
