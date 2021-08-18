param sqlServerName string
param sqlDatabaseName string 
param administratorLogin string
param administratorLoginPassword string
param AADUser string
param AADObjectId string
param AADTenantId string

resource sqlServer 'Microsoft.Sql/servers@2021-02-01-preview' = {
  location: resourceGroup().location
  name: sqlServerName
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
  }
}

resource sqlServerAAD 'Microsoft.Sql/servers/administrators@2021-02-01-preview' = {
  parent: sqlServer
  name: 'ActiveDirectory'
  properties: {
    administratorType: 'ActiveDirectory'
    login: AADUser
    sid: AADObjectId
    tenantId: AADTenantId
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2021-02-01-preview' = {
  parent: sqlServer
  location: resourceGroup().location
  name: sqlDatabaseName
  sku: {
    name: 'Basic'
  }
}

resource servers_tabfuncsql_sql_2b31ae_name_AllowAzure 'Microsoft.Sql/servers/firewallRules@2021-02-01-preview' = {
  parent: sqlServer
  name: 'AllowAzure'
  properties: {
    endIpAddress: '0.0.0.0'
    startIpAddress: '0.0.0.0'
  }
}

output sqlEndpoint string = sqlServer.properties.fullyQualifiedDomainName
output databaseName string = sqlDatabaseName
