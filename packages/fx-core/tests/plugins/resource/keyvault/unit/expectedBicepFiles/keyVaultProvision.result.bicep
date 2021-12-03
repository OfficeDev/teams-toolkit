@secure()
param provisionParameters object
param userAssignedIdentityObjectId string

var resourceBaseName = provisionParameters.resourceBaseName
var keyVaultName = contains(provisionParameters, 'keyVaultName') ? provisionParameters['keyVaultName'] : '${resourceBaseName}'
var tenantId = subscription().tenantId
var m365ClientSecretName = 'm365ClientSecret'
var m365ClientSecret = provisionParameters['m365ClientSecret']
var botClientSecretName = 'botClientSecret'
var botClientSecret = contains(provisionParameters, 'botAadAppClientSecret') ? provisionParameters['botAadAppClientSecret'] : ''
var keyVaultSkuName = contains(provisionParameters, 'keyVaultSkuName') ? provisionParameters['keyVaultSkuName'] : 'standard'

resource keyVault 'Microsoft.KeyVault/vaults@2019-09-01' = {
  name: keyVaultName
  location: resourceGroup().location
  properties: {
    tenantId: tenantId
    accessPolicies: [
      {
        tenantId: tenantId
        objectId: userAssignedIdentityObjectId
        permissions: {
          secrets: [
            'get'
          ]
        }
      }
    ]
    sku: {
      name: keyVaultSkuName // You can follow https://aka.ms/teamsfx-bicep-add-param-tutorial to add "keyVaultSkuName" property to provisionParameters to override the default value "standard".
      family: 'A'
    }
  }
}

resource clientSecretKv 'Microsoft.KeyVault/vaults/secrets@2019-09-01' = if (length(m365ClientSecret) != 0) {
  parent: keyVault
  name: m365ClientSecretName
  properties: {
    value: m365ClientSecret
  }
}

resource botVlientSecretKv 'Microsoft.KeyVault/vaults/secrets@2019-09-01' = if (length(botClientSecret) != 0) {
  parent: keyVault
  name: botClientSecretName
  properties: {
    value: botClientSecret
  }
}

output m365ClientSecretReference string = '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=${m365ClientSecretName})'
output botClientSecretReference string = '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=${botClientSecretName})'
