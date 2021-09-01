module functionProvision '{{PluginOutput.fx-resource-function.Modules.functionProvision.Path}}' = {
  name: 'functionProvision'
  params: {
    functionAppName: function_webappName
    functionServerfarmsName: function_serverfarmsName
    functionStorageName: function_storageName
    {{#contains 'fx-resource-identity' Plugins}}
    identityName: {{../PluginOutput.fx-resource-identity.Outputs.identityName}}
    {{/contains}}
  }
}
module functionConfiguration '{{PluginOutput.fx-resource-function.Modules.functionConfiguration.Path}}' = {
  name: 'functionConfiguration'
  dependsOn: [
    functionProvision
  ]
  params: {
    functionAppName: function_webappName
    functionStorageName: function_storageName
    m365ClientId: m365ClientId
    m365ClientSecret: m365ClientSecret
    m365TenantId: m365TenantId
    m365ApplicationIdUri: m365ApplicationIdUri
    m365OauthAuthorityHost: m365OauthAuthorityHost
    {{#contains 'fx-resource-frontend-hosting' Plugins}}
    frontendHostingStorageEndpoint: {{../PluginOutput.fx-resource-frontend-hosting.Outputs.endpoint}}
    {{/contains}}
    {{#contains 'fx-resource-azure-sql' Plugins}}
    sqlDatabaseName: {{../PluginOutput.fx-resource-azure-sql.Outputs.databaseName}}
    sqlEndpoint: {{../PluginOutput.fx-resource-azure-sql.Outputs.sqlEndpoint}}
    {{/contains}}
    {{#contains 'fx-resource-identity' Plugins}}
    identityId: {{../PluginOutput.fx-resource-identity.Outputs.identityId}}
    {{/contains}}
  }
}
