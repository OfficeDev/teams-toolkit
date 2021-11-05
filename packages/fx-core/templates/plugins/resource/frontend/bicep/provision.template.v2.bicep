module frontendHostingProvision '{{PluginOutput.fx-resource-frontend-hosting.Provision.frontendHosting.ProvisionPath}}' = {
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
