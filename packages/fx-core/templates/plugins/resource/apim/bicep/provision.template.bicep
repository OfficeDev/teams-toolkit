// Resources for APIM
module apimProvision '\{{fx-resource-apim.Provision.apim.path}}'  = {
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
