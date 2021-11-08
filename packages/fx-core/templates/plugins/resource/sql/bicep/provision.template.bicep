module azureSqlProvision '{{PluginOutput.fx-resource-azure-sql.Provision.azureSql.ProvisionPath}}' = {
  name: 'azureSqlProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output azureSqlOutput object = {
  teamsFxPluginId: 'fx-resource-azure-sql'
  sqlResourceId: azureSqlProvision.outputs.resourceId
  sqlEndpoint: azureSqlProvision.outputs.sqlEndpoint
  databaseName: azureSqlProvision.outputs.databaseName
}
