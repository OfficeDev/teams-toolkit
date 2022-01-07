// Resources for web app
module webappProvision '\{{fx-resource-frontend-hosting.Provision.webapp.path}}' = {
  name: 'aspdotnetProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.identityResourceId
  }
}

output webappOutput object = {
  teamsFxPluginId: 'fx-resource-frontend-hosting'
  domain: webappProvision.outputs.domain
  endpoint: webappProvision.outputs.endpoint
  webAppResourceId: webappProvision.outputs.resourceId
}
