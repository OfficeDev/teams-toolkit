module azureSqlProvision '{{PluginOutput.fx-resource-azure-sql.Provision.azureSql.ProvisionPath}}' = {
  name: 'azureSqlProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output azureSqlOutput object = {
  teamsFxPluginId: 'fx-resource-azure-sql'
  sqlServerResourceId: azureSqlProvision.outputs.resourceId
  sqlServerEndpoint: azureSqlProvision.outputs.sqlEndpoint
  sqlDatabaseName: azureSqlProvision.outputs.databaseName
}
