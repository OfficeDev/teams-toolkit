// Resources for Azure Key Vault
module keyVaultProvision './provision/keyVault.bicep' = {
  name: 'keyVaultProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityObjectId: {{identity.principalId}}
  }
}

output keyVaultOutput object = {
  teamsFxPluginId: 'key-vault'
  keyVaultResourceId: keyVaultProvision.outputs.keyVaultResourceId
  m365ClientSecretReference: keyVaultProvision.outputs.m365ClientSecretReference
  botClientSecretReference: keyVaultProvision.outputs.botClientSecretReference
}
