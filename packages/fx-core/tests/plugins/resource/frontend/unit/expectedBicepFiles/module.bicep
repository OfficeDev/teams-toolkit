
module frontendHostingProvision './frontend_hosting_test.bicep' = {
  name: 'frontendHostingDeploy'
  params: {
    frontend_hosting_storage_name: frontendHosting_storageName
  }
}
