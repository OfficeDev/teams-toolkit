@secure()
param provisionParameters object
param userAssignedIdentityObjectId string // User assigned identity that will be grant Key Vault access permission

var resourceBaseName = provisionParameters.resourceBaseName
var keyVaultName = contains(provisionParameters, 'keyVaultName') ? provisionParameters['keyVaultName'] : '${resourceBaseName}' // Try to read name for Key Vault from parameters
var tenantId = subscription().tenantId
var m365ClientSecretName = 'm365ClientSecret' // Secret name of AAD app client secret
var m365ClientSecret = contains(provisionParameters, 'm365ClientSecret') ? provisionParameters['m365ClientSecret'] : '' // Try to read AAD app client secret from parameters
var botClientSecretName = 'botClientSecret' // Secret name of bot's AAD app client secret
var botClientSecret = contains(provisionParameters, 'botAadAppClientSecret') ? provisionParameters['botAadAppClientSecret'] : '' // Try to read bot's AAD app client secret from parameters
var keyVaultSkuName = contains(provisionParameters, 'keyVaultSkuName') ? provisionParameters['keyVaultSkuName'] : 'standard' // Try to read SKU for Key Vault from parameters

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

// Set or update AAD app client secret if it's not empty in parameters
resource clientSecretKv 'Microsoft.KeyVault/vaults/secrets@2019-09-01' = if (length(m365ClientSecret) != 0) {
  parent: keyVault
  name: m365ClientSecretName
  properties: {
    value: m365ClientSecret
  }
}

// Set or update bot's AAD app client secret if it's not empty in parameters
resource botClientSecretKv 'Microsoft.KeyVault/vaults/secrets@2019-09-01' = if (length(botClientSecret) != 0) {
  parent: keyVault
  name: botClientSecretName
  properties: {
    value: botClientSecret
  }
}

output keyVaultResourceId string = keyVault.id
output m365ClientSecretReference string = '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=${m365ClientSecretName})'
output botClientSecretReference string = '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=${botClientSecretName})'
