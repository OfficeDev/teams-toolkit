
module frontendHostingProvision './frontend_hosting_test.bicep' = {
  name: 'frontendHostingProvision'
  params: {
    frontend_hosting_storage_name: frontendHosting_storageName
  }
}
