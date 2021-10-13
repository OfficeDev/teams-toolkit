param managedIdentityName string

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2018-11-30' = {
  name: managedIdentityName
  location: resourceGroup().location
}

output identityName string = managedIdentityName
output identityClientId string = managedIdentity.properties.clientId
output identityResourceId string = managedIdentity.id
