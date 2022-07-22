// Resources for frontend hosting
module azureStorage{{scenario}}Provision './provision/azureStorage{{scenario}}.bicep' = {
  name: 'azureStorage{{scenario}}Provision'
  params: {
    provisionParameters: provisionParameters
  }
}

output azureStorage{{scenario}}Output object = {
  teamsFxPluginId: '{{componentId}}'
  domain: azureStorage{{scenario}}Provision.outputs.domain
  endpoint: azureStorage{{scenario}}Provision.outputs.endpoint
  indexPath: azureStorage{{scenario}}Provision.outputs.indexPath
  storageResourceId: azureStorage{{scenario}}Provision.outputs.storageResourceId
}


output {{scenario}}Output object = {
  domain: azureStorage{{scenario}}Provision.outputs.domain
  endpoint: azureStorage{{scenario}}Provision.outputs.endpoint
}
