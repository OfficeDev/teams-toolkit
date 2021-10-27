module frontendHostingProvision '{{PluginOutput.fx-resource-frontend-hosting.Modules.frontendHostingProvision.Path}}' = {
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
