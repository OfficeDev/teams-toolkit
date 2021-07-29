
module simpleAuthProvision './simple_auth_test.bicep' = {
  name: 'simpleAuthProvision'
  params: {
    simpleAuthServerFarmsName: simpleAuth_serverFarmsName
    simpleAuthWebAppName: simpleAuth_webAppName
    sku: simpleAuth_sku
    aadClientId: aadClientId
    aadClientSecret: aadClientSecret
    applicationIdUri: applicationIdUri
    frontendHostingStorageEndpoint: frontend_hosting_test_endpoint
    m365TenantId: m365TenantId
    oauthAuthorityHost: m365OauthAuthorityHost
  }
}
