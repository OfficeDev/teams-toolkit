
module functionProvision '{{PluginOutput.fx-resource-function.Modules.functionProvision.Path}}' = {
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
