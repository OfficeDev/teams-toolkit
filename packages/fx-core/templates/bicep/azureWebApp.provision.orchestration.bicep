// Resources web app
module azureWebApp{{componentName}}Provision './provision/azureWebApp{{componentName}}.bicep' = {
  name: 'azureWebApp{{componentName}}Provision'
  params: {
    provisionParameters: provisionParameters
  }
}


output azureWebApp{{componentName}}Output object = {
  teamsFxPluginId: '{{componentId}}'
  skuName: azureWebApp{{componentName}}Provision.outputs.skuName
  siteName: azureWebApp{{componentName}}Provision.outputs.siteName
  validDomain: azureWebApp{{componentName}}Provision.outputs.validDomain
  appServicePlanName: azureWebApp{{componentName}}Provision.outputs.appServicePlanName
  resourceId: azureWebApp{{componentName}}Provision.outputs.resourceId
  siteEndpoint: azureWebApp{{componentName}}Provision.outputs.siteEndpoint
}
