// Resources for web app
module webappProvision '\{{fx-resource-aspdnet.Provision.webapp.path}}' = {
  name: 'webappProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.identityResourceId
  }
}

output webappOutput object = {
  teamsFxPluginId: 'fx-resource-aspdnet'
  domain: webappProvision.outputs.domain
  endpoint: webappProvision.outputs.endpoint
  indexPath: webappProvision.outputs.indexPath
  webAppResourceId: webappProvision.outputs.resourceId
}
