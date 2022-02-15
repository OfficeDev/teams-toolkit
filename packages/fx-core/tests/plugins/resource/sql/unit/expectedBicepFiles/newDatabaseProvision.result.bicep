// output for database with name suffix [000000]
output azureSqlOutput_000000 object = {
  teamsFxPluginId: 'fx-resource-azure-sql'
  databaseName_000000: azureSqlProvision.outputs.databaseName_000000
}
