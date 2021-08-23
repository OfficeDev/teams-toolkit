param managedIdentityName string

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2018-11-30' = {
  name: managedIdentityName
  location: resourceGroup().location
}

output identityName string = managedIdentity.id
output identityId string = managedIdentity.properties.clientId
output identity string = managedIdentityName
