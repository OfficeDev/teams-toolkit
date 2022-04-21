// Resources for Azure SQL
module azureSqlProvision '{{azure-sql.Provision.azureSql.path}}' = {
  name: 'azureSqlProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output azureSqlOutput object = {
  teamsFxPluginId: 'azure-sql'
  sqlResourceId: azureSqlProvision.outputs.resourceId
  sqlEndpoint: azureSqlProvision.outputs.sqlEndpoint
  sqlDatabaseName: azureSqlProvision.outputs.sqlDatabaseName
}
