@secure()
param provisionParameters object

// Resources web app
module azureWebAppTabProvision './provision/azureWebAppTab.bicep' = {
  name: 'azureWebAppTabProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.identityResourceId
  }
}


output azureWebAppTabOutput object = {
  teamsFxPluginId: 'teams-tab'
  skuName: azureWebAppTabProvision.outputs.skuName
  siteName: azureWebAppTabProvision.outputs.siteName
  domain: azureWebAppTabProvision.outputs.domain
  appServicePlanName: azureWebAppTabProvision.outputs.appServicePlanName
  resourceId: azureWebAppTabProvision.outputs.resourceId
  siteEndpoint: azureWebAppTabProvision.outputs.siteEndpoint
  endpoint: azureWebAppTabProvision.outputs.siteEndpoint
}

output TabOutput object = {
  domain: azureWebAppTabProvision.outputs.domain
  endpoint: azureWebAppTabProvision.outputs.siteEndpoint
}

// Resources for identity
module userAssignedIdentityProvision './provision/identity.bicep' = {
  name: 'userAssignedIdentityProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output identityOutput object = {
  teamsFxPluginId: 'identity'
  identityName: userAssignedIdentityProvision.outputs.identityName
  identityResourceId: userAssignedIdentityProvision.outputs.identityResourceId
  identityClientId: userAssignedIdentityProvision.outputs.identityClientId
}