// Resources for Key Vault
module simpleAuthProvision '{{PluginOutput.fx-resource-key-vault.Provision.keyVault.ProvisionPath}}' = {
  name: 'keyVaultProvision'
  params: {
    provisionParameters: provisionParameters
  }
}
