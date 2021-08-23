
module functionProvision './function_test.bicep' = {
  name: 'functionProvision'
  params: {
    functionAppName: function_webappName
    functionServerfarmsName: function_serverfarmsName
    functionStorageName: function_storageName
    m365ClientId: m365ClientId
    m365ClientSecret: m365ClientSecret
    m365TenantId: m365TenantId
    applicationIdUri: applicationIdUri
    m365OauthAuthorityHost: m365OauthAuthorityHost
    frontendHostingStorageEndpoint: frontend_hosting_test_endpoint
  }
}
