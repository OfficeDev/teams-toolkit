// Resources for APIM
module apimProvision './teamsFx/apim.bicep'  = {
  name: 'apimProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output apimOutput object = {
  teamsFxPluginId: 'apim'
  serviceResourceId: apimProvision.outputs.serviceResourceId
  productResourceId: apimProvision.outputs.productResourceId
}
