// Resources for bot
module botProvision '\{{fx-resource-dotnet.Provision.botservice.path}}' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    botEndpoint: \{{fx-resource-dotnet.References.endpointAsParam}}
  }
}

output botOutput object = {
  teamsFxPluginId: 'fx-resource-dotnet'
  validDomain: \{{fx-resource-dotnet.References.domainAsParam}}
}
