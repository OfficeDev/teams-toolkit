// Resources for Azure Key Vault
module keyVaultProvision '{{PluginOutput.fx-resource-key-vault.Provision.keyVault.ProvisionPath}}' = {
  name: 'keyVaultProvision'
  params: {
    provisionParameters: provisionParameters
    userAssignedIdentityObjectId: {{PluginOutput.fx-resource-identity.References.identityPrincipalId}}
  }
}
