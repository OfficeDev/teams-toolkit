// Resources web app
module azureWebApp{{componentName}}Provision './provision/azureWebApp{{componentName}}.bicep' = {
  name: 'azureWebApp{{componentName}}Provision'
  params: {
    provisionParameters: provisionParameters
  }
}


output azureWebApp{{componentName}}Output object = {
  teamsFxPluginId: '{{componentId}}'
  sku: azureWebApp{{componentName}}Provision.outputs.sku
  appName: azureWebApp{{componentName}}Provision.outputs.appName
  domain: azureWebApp{{componentName}}Provision.outputs.domain
  appServicePlanName: azureWebApp{{componentName}}Provision.outputs.appServicePlanName
  resourceId: azureWebApp{{componentName}}Provision.outputs.resourceId
  endpoint: azureWebApp{{componentName}}Provision.outputs.endpoint
}
