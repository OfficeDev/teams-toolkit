// database added with name suffix [000000]
var sqlDatabaseName_000000 = contains(provisionParameters, 'sqlDatabaseName_000000') ? provisionParameters['sqlDatabaseName_000000'] : '${resourceBaseName}_000000'
var sqlDatabaseSku_000000 = contains(provisionParameters, 'sqlDatabaseSku_000000') ? provisionParameters['sqlDatabaseSku_000000'] : 'Basic'

resource sqlDatabase_000000 'Microsoft.Sql/servers/databases@2021-05-01-preview' = {
  // parent should refer to resource symbolic name of SQL server
  parent: sqlServer
  location: resourceGroup().location
  name: sqlDatabaseName_000000
  sku: {
    name: sqlDatabaseSku_000000 
  }
}

output databaseName_000000 string = sqlDatabaseName_000000
