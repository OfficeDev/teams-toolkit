// output for database with name suffix [{{suffix}}]
output azureSqlOutput_{{suffix}} object = {
  teamsFxPluginId: 'fx-resource-azure-sql'
  databaseName_{{suffix}}: azureSqlProvision.outputs.databaseName_{{suffix}}
}
