param sqlServerName string
param sqlDatabaseName string
param administratorLogin string
@secure()
param administratorLoginPassword string

resource sqlServer 'Microsoft.Sql/servers@2021-02-01-preview' = {
  location: resourceGroup().location
  name: sqlServerName
  properties: {
    administratorLogin: empty(administratorLogin) ? null : administratorLogin
    administratorLoginPassword: administratorLoginPassword
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

resource sqlFirewallRules 'Microsoft.Sql/servers/firewallRules@2021-02-01-preview' = {
  parent: sqlServer
  name: 'AllowAzure'
  properties: {
    endIpAddress: '0.0.0.0'
    startIpAddress: '0.0.0.0'
  }
}

output resourceId string = sqlServer.id
output sqlEndpoint string = sqlServer.properties.fullyQualifiedDomainName
output databaseName string = sqlDatabaseName
