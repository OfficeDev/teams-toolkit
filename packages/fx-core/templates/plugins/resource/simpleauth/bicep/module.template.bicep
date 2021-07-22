
module simpleAuthProvision '{{fx-resource-simple-auth.modules.simpleAuthProvision.path}}' = {
  name: 'simpleAuthProvision'
  params: {
    simpleAuthServerFarmsName: simpleAuth_serverFarmsName
    simpleAuthWebAppName: simpleAuth_webAppName
    sku: simpleAuth_sku
    AADClientId: AADClientId
    AADClientSecret: AADClientSecret
    applicationIdUri: applicationIdUri
    {{#contains 'fx-resource-frontend-hosting' plugins}}
    frontendHostingStorageEndpoint: {{../fx-resource-frontend-hosting.outputs.endpoint}}
    {{/contains}}
    m365TenantId: m365TenantId
    oauthAuthorityHost: m365OauthAuthorityHost
  }
}
