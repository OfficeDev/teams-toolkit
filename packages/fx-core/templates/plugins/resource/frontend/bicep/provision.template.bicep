// Resources for frontend hosting
module frontendHostingProvision '\{{fx-resource-frontend-hosting.Provision.frontendHosting.path}}' = {
  name: 'frontendHostingProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output frontendHostingOutput object = {
  teamsFxPluginId: 'fx-resource-frontend-hosting'
  domain: frontendHostingProvision.outputs.domain
  endpoint: frontendHostingProvision.outputs.endpoint
  indexPath: frontendHostingProvision.outputs.indexPath
  storageResourceId: frontendHostingProvision.outputs.resourceId
}
