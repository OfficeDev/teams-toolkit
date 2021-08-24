
param azureSql_admin string
@secure()
param azureSql_adminPassword string
param azureSql_serverName string = '${resourceBaseName}-sql-server'
param azureSql_databaseName string = '${resourceBaseName}-database'
