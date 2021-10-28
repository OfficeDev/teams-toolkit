param provisionParameters object
var resourceBaseName = provisionParameters.resourceBaseName
var identityName = contains(provisionParameters, 'userAssignedIdentityName') ? provisionParameters['userAssignedIdentityName'] : '${resourceBaseName}-managedIdentity'

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2018-11-30' = {
  name: identityName
  location: resourceGroup().location
}

output resourceId string = managedIdentity.id
output clientId string = managedIdentity.properties.clientId
