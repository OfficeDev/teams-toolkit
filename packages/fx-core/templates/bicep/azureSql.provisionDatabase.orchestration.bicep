// output for database with name suffix [{{suffix}}]
output azureSqlOutput_{{suffix}} object = {
  teamsFxPluginId: 'azure-sql'
  databaseName_{{suffix}}: azureSqlProvision.outputs.databaseName_{{suffix}}
}
