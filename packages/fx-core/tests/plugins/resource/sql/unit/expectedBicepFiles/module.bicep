
module azureSqlProvision './sql.template.bicep' = {
  name: 'azureSqlProvision'
  params: {
    sqlServerName: azureSql_serverName
    sqlDatabaseName: azureSql_databaseName
    administratorLogin: azureSql_admin
    administratorLoginPassword: azureSql_adminPassword
  }
}
