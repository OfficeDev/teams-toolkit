@secure()
param provisionParameters object
// Resources for identity
module userAssignedIdentityProvision './provision/identity.bicep' = {
  name: 'userAssignedIdentityProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output identityOutput object = {
  teamsFxPluginId: 'fx-resource-identity'
  identityName: userAssignedIdentityProvision.outputs.identityName
  identityResourceId: userAssignedIdentityProvision.outputs.identityResourceId
  identityClientId: userAssignedIdentityProvision.outputs.identityClientId
}
module botFunctionProvision './provision/botFunction.bicep' = {
  name: 'botFunctionProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: userAssignedIdentityProvision.outputs.identityResourceId
  }
}

output botFunctionOutput object = {
  teamsFxPluginId: 'fx-resource-bot'
  skuName: botFunctionProvision.outputs.functionSKU
  siteName: botFunctionProvision.outputs.functionName
  validDomain: botFunctionProvision.outputs.domain
  appServicePlanName: botFunctionProvision.outputs.appServicePlanName
  resourceId: botFunctionProvision.outputs.functionResourceId
  siteEndpoint: botFunctionProvision.outputs.functionEndpoint
}
// Resources for bot
module botProvision './provision/botservice.bicep' = {
  name: 'botProvision'
  params: {
    provisionParameters: provisionParameters
    botEndpoint: botFunctionProvision.outputs.functionEndpoint
  }
}