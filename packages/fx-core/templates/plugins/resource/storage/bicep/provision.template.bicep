// Resources for frontend hosting
module azureStorageProvision '\{{fx-resource-azure-storage.Provision.azureStorage.path}}' = {
  name: 'azureStorageProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output azureStorageOutput object = {
  teamsFxPluginId: 'fx-resource-frontend-hosting'
  domain: azureStorageProvision.outputs.domain
  endpoint: azureStorageProvision.outputs.endpoint
  indexPath: azureStorageProvision.outputs.indexPath
  storageResourceId: azureStorageProvision.outputs.resourceId
}
