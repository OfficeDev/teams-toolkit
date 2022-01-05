// Resources for Azure Key Vault
module keyVaultProvision '\{{fx-resource-key-vault.Provision.keyVault.path}}' = {
  name: 'keyVaultProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityObjectId: \{{fx-resource-identity.References.identityPrincipalId}}
  }
}

output keyVaultOutput object = {
  teamsFxPluginId: 'fx-resource-key-vault'
  keyVaultResourceId: keyVaultProvision.outputs.keyVaultResourceId
  m365ClientSecretReference: keyVaultProvision.outputs.m365ClientSecretReference
  botClientSecretReference: keyVaultProvision.outputs.botClientSecretReference
}
