
module userAssignedIdentityProvision './userAssignedIdentity.template.bicep' = {
  name: 'userAssignedIdentityProvision'
  params: {
    managedIdentityName: identity_managedIdentityName
  }
}
