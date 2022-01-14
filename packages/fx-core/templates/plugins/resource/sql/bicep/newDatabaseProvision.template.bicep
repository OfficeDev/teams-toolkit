// database added with name suffix [{{suffix}}]
var sqlDatabaseName_{{suffix}} = contains(provisionParameters, 'sqlDatabaseName_{{suffix}}') ? provisionParameters['sqlDatabaseName_{{suffix}}'] : '${resourceBaseName}_{{suffix}}'
var sqlDatabaseSku_{{suffix}} = contains(provisionParameters, 'sqlDatabaseSku_{{suffix}}') ? provisionParameters['sqlDatabaseSku_{{suffix}}'] : 'Basic'

resource sqlDatabase_{{suffix}} 'Microsoft.Sql/servers/databases@2021-05-01-preview' = {
  // parent should refer to resource symbolic name of SQL server
  parent: sqlServer
  location: resourceGroup().location
  name: sqlDatabaseName_{{suffix}}
  sku: {
    name: sqlDatabaseSku_{{suffix}} 
  }
}

output databaseName_{{suffix}} string = sqlDatabaseName_{{suffix}}
