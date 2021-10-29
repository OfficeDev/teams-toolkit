
module azureSqlProvision '{{PluginOutput.fx-resource-azure-sql.Modules.azureSqlProvision.ProvisionPath}}' = {
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
