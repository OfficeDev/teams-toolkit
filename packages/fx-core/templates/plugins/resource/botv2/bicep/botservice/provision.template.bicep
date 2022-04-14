// Resources for bot
module botProvision '\{{fx-resource-bot.Provision.bot.path}}' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    botEndpoint: \{{fx-resource-bot.References.endpointAsParam}}
  }
}

output botOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
}
