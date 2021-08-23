
module simpleAuthProvision './simple_auth.only.bicep' = {
  name: 'simpleAuthProvision'
  params: {
    simpleAuthServerFarmsName: simpleAuth_serverFarmsName
    simpleAuthWebAppName: simpleAuth_webAppName
    sku: simpleAuth_sku
    m365ClientId: m365ClientId
    m365ClientSecret: m365ClientSecret
    m365ApplicationIdUri: m365ApplicationIdUri
    m365TenantId: m365TenantId
    oauthAuthorityHost: m365OauthAuthorityHost
  }
}
