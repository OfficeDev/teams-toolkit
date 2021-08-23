
module frontendHostingProvision './frontend_hosting.bicep' = {
  name: 'frontendHostingProvision'
  params: {
    frontendHostingStorageName: frontendHosting_storageName
  }
}
