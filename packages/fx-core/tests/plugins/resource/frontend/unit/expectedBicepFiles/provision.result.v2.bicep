module frontendHostingProvision './frontendProvision.result.v2.bicep' = {
  name: 'frontendHostingProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output frontendHostingOutput object = {
  teamsFxPluginId: 'fx-resource-frontend'
  domain: frontendHostingProvision.outputs.domain
  endpoint: frontendHostingProvision.outputs.endpoint
  resourceId: frontendHostingProvision.outputs.resourceId
}
