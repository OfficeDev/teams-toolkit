
module functionProvision './function_test.bicep' = {
  name: 'functionProvision'
  params: {
    functionAppName: function_webappName
    functionServerfarmsName: function_serverfarmsName
    functionStorageName: function_storageName
    aadClientId: aadClientId
    aadClientSecret: aadClientSecret
    m365TenantId: m365TenantId
    applicationIdUri: applicationIdUri
    frontendHostingStorageEndpoint: frontend_hosting_test_endpoint
  }
}
