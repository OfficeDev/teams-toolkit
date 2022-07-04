// Resources Azure Function App
module azureFunction{{componentName}}Provision './provision/azureFunction{{componentName}}.bicep' = {
  name: 'azureFunction{{componentName}}Provision'
  params: {
    provisionParameters: provisionParameters
  }
}

output azureFunction{{componentName}}Output object = {
  teamsFxPluginId: '{{componentId}}'
  sku: azureFunction{{componentName}}Provision.outputs.sku
  appName: azureFunction{{componentName}}Provision.outputs.appName
  domain: azureFunction{{componentName}}Provision.outputs.domain
  appServicePlanName: azureFunction{{componentName}}Provision.outputs.appServicePlanName
  functionAppResourceId: azureFunction{{componentName}}Provision.outputs.resourceId
  functionEndpoint: azureFunction{{componentName}}Provision.outputs.endpoint
}
