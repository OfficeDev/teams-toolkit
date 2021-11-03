// Resources for APIM
module apimProvision '{{PluginOutput.fx-resource-apim.Modules.apimProvision.ProvisionPath}}'  = {
  name: 'apimProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output apimOutput object = {
  teamsFxPluginId: 'fx-resource-apim'
  serviceResourceId: apimProvision.outputs.serviceResourceId
  productResourceId: apimProvision.outputs.productResourceId
}
