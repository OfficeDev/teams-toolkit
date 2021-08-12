
module functionProvision './function_test.bicep' = {
  name: 'functionProvision'
  params: {
    functionAppName: function_webappName
    functionServerfarmsName: function_serverfarmsName
    functionStorageName: function_storageName
    functionNodeVersion: function_nodeVersion
    AADClientId: AADClientId
    AADClientSecret: AADClientSecret
    tenantId: tenantId
    applicationIdUri: applicationIdUri
    frontendHostingStorageEndpoint: frontend_hosting_test_endpoint
  }
}
