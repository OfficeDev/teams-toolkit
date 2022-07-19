// Resources for Azure SQL
module azureSqlProvision './provision/azureSql.bicep' = {
  name: 'azureSqlProvision'
  params: {
    provisionParameters: provisionParameters
  }
}

output azureSqlOutput object = {
  teamsFxPluginId: 'azure-sql'
  sqlResourceId: azureSqlProvision.outputs.sqlResourceId
  sqlEndpoint: azureSqlProvision.outputs.sqlEndpoint
  sqlDatabaseName: azureSqlProvision.outputs.sqlDatabaseName
}
