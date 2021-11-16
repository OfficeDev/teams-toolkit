param keyVaultName string
param msiTenantId string
param msiObjectId string
@secure()
param m365ClientSecret string
@secure()
param botClientSecret string

var m365ClientSecretName = 'm365ClientSecret'
var botClientSecretName = 'botClientSecret'

resource keyVault 'Microsoft.KeyVault/vaults@2019-09-01' = {
  name: keyVaultName
  location: resourceGroup().location
  properties: {
    tenantId: msiTenantId
    accessPolicies: [
      {
        tenantId: msiTenantId
        objectId: msiObjectId
        permissions: {
          secrets: [
            'list'
            'get'
          ]
        }
      }
    ]
    sku: {
      name: 'standard'
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
