// Resources for frontend hosting
module azureStorageProvision './provision/azureStorage.bicep' = {
  name: 'azureStorageProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output azureStorageOutput object = {
  teamsFxPluginId: 'azure-storage'
  domain: azureStorageProvision.outputs.domain
  endpoint: azureStorageProvision.outputs.endpoint
  indexPath: azureStorageProvision.outputs.indexPath
  resourceId: azureStorageProvision.outputs.resourceId
}
