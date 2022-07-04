// Resources for frontend hosting
module azureStorage{{componentName}}Provision './provision/azureStorage{{componentName}}.bicep' = {
  name: 'azureStorage{{componentName}}Provision'
  params: {
    provisionParameters: provisionParameters
  }
}

output azureStorage{{componentName}}Output object = {
  teamsFxPluginId: '{{componentId}}'
  domain: azureStorage{{componentName}}Provision.outputs.domain
  endpoint: azureStorage{{componentName}}Provision.outputs.endpoint
  indexPath: azureStorage{{componentName}}Provision.outputs.indexPath
  resourceId: azureStorage{{componentName}}Provision.outputs.resourceId
}
