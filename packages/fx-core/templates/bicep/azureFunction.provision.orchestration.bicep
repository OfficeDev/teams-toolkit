// Resources Azure Function App
module azureFunction{{scenario}}Provision './provision/azureFunction{{scenario}}.bicep' = {
  name: 'azureFunction{{scenario}}Provision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityId: {{identity.resourceId}}
  }
}

output azureFunction{{scenario}}Output object = {
  teamsFxPluginId: '{{componentId}}'
  sku: azureFunction{{scenario}}Provision.outputs.sku
  appName: azureFunction{{scenario}}Provision.outputs.appName
  domain: azureFunction{{scenario}}Provision.outputs.domain
  appServicePlanName: azureFunction{{scenario}}Provision.outputs.appServicePlanName
  functionAppResourceId: azureFunction{{scenario}}Provision.outputs.functionAppResourceId
  functionEndpoint: azureFunction{{scenario}}Provision.outputs.functionEndpoint
}

output {{scenario}}Output object = {
  domain: azureFunction{{scenario}}Provision.outputs.domain
  endpoint: azureFunction{{scenario}}Provision.outputs.functionEndpoint
}
