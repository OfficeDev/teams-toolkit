module simpleAuthProvision '{{PluginOutput.fx-resource-simple-auth.Modules.simpleAuthProvision.Path}}' = {
  name: 'simpleAuthProvision'
  params: {
    simpleAuthServerFarmsName: simpleAuth_serverFarmsName
    simpleAuthWebAppName: simpleAuth_webAppName
    sku: simpleAuth_sku
  }
}
module simpleAuthConfiguration '{{PluginOutput.fx-resource-simple-auth.Modules.simpleAuthConfiguration.Path}}' = {
  name: 'simpleAuthConfiguration'
  dependsOn: [
    simpleAuthProvision
  ]
  params: {
    simpleAuthWebAppName: simpleAuth_webAppName
    m365ClientId: m365ClientId
    m365ClientSecret: m365ClientSecret
    m365ApplicationIdUri: m365ApplicationIdUri
    {{#contains 'fx-resource-frontend-hosting' Plugins}}
    frontendHostingStorageEndpoint: {{../PluginOutput.fx-resource-frontend-hosting.Outputs.endpoint}}
    {{/contains}}
    m365TenantId: m365TenantId
    oauthAuthorityHost: m365OauthAuthorityHost
    simpelAuthPackageUri: simpleAuth_packageUri
  }
}
