// Resources for Azure Key Vault
module keyVaultProvision './keyVaultProvision.result.bicep' = {
  name: 'keyVaultProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityObjectId: userAssignedIdentityProvision.outputs.identityPrincipalId
  }
}

output keyVaultOutput object = {
  teamsFxPluginId: 'fx-resource-key-vault'
  keyVaultResourceId: keyVaultProvision.outputs.keyVaultResourceId
  m365ClientSecretReference: keyVaultProvision.outputs.m365ClientSecretReference
  botClientSecretReference: keyVaultProvision.outputs.botClientSecretReference
}
