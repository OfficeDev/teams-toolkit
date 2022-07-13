// Resources web app
module azureWebApp{{scenario}}Provision './provision/azureWebApp{{scenario}}.bicep' = {
  name: 'azureWebApp{{scenario}}Provision'
  params: {
    provisionParameters: provisionParameters
  }
}


output azureWebApp{{scenario}}Output object = {
  teamsFxPluginId: '{{componentId}}'
  skuName: azureWebApp{{scenario}}Provision.outputs.skuName
  siteName: azureWebApp{{scenario}}Provision.outputs.siteName
  validDomain: azureWebApp{{scenario}}Provision.outputs.validDomain
  appServicePlanName: azureWebApp{{scenario}}Provision.outputs.appServicePlanName
  resourceId: azureWebApp{{scenario}}Provision.outputs.resourceId
  siteEndpoint: azureWebApp{{scenario}}Provision.outputs.siteEndpoint
}
