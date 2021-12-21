// Resources for Azure Key Vault
module keyVaultProvision '{{Plugins.fx-resource-key-vault.Provision.keyVault.ProvisionPath}}' = {
  name: 'keyVaultProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityObjectId: {{Plugins.fx-resource-identity.References.identityPrincipalId}}
  }
}

output keyVaultOutput object = {
  teamsFxPluginId: 'fx-resource-key-vault'
  m365ClientSecretReference: keyVaultProvision.outputs.m365ClientSecretReference
  botClientSecretReference: keyVaultProvision.outputs.botClientSecretReference
}
