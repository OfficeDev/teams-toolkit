## aad.AadGetSkipAppConfigError

### Error Message

Failed to get all necessary info. You need to set objectId, clientId, clientSecret, oauth2PermissionScopeId under fx-resource-aad-app-for-teams in `state.{envName}.json`.

### Mitigation

Root cause of this error is that necessary info is not included in `config.${env}.json` file. To correctly skip creating new Azure AD app, please follow the instruction and make sure required info is included in your file. For detail, please refer to [tutorial for using existing aad](./using-existing-aad.md#set-necessary-info-in-teamsfx-project).


## aad.AadGetAppError

### Error Message

Failed to get app info with current Object Id in `.fx/state/state.${env}.json`. Please make sure object id is valid, or delete 'objectId' under fx-resource-aad-app-for-teams in `.fx/state/state.${env}.json` and try again.

### Mitigation

Root cause of this error is that toolkit can not find Azure AD app with the same object id saved in your `state.${env}.json` file. Please follow the instruction following to address the error.

1. Open `.fx/state/state.${env}.json` file
2. Find `fx-resource-aad-app-for-teams`. Note value of key *clientId*
3. Go to Azure Portal, login with the same account as the M365 account in toolkit, select "Azure Active Directory"
4. Select "App Registrations" and search for you Azure AD app by client id noted above.

If you can find your Azure AD app, please check your network status and try again.

If you can not find your Azure AD app, please check whether you logged in with the correct account. You can also remove objectId from `.fx/state/state.${env}.json` file and then try again.