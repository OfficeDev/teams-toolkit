This doc is to help you understand what will happen when provisioning for an already-provisioned environment but with different account or Azure subscription or local debugging again with another Microsoft 365(M365) account. We will also explain how to recover from the backups 

> Important Notes: After switching accounts and run provision or local debugging again, all resources have been created before in the old M365 tenant or Azure subscription won't be deleted by default, and you have to manully delete them to avoid further costs if any. 

## Switch Microsoft 365 account
### Local debug
You could run local debugging for a Teams project with one M365 account and then easily switch to another account for further local debugging. To do this, you only need to:
1. Sign out of the current M365 account.
2. Sign in to the new account.
3. Start local debugging.

After that, we will 
1. Back up configuration files for local environment ([learn more about backup & recover](#backup--recover)).
2. Create all resources required for the local environment in the new M365 tenant.
3. `state.local.json` file in .fx/states folder will be overwritten with the information of new resources in the new M365 tenant. If the project requires AAD, `local.userdata` will be overwritten with the new client secret.

### Provision in a remote environment
You could provision resources in a remote environment with one M365 account and then re-provision in the same environment but with another M365 account. To do this, you only need to:
1. Sign out of the current M365 account.
2. Sign in to the new account.
3. Start provision in the selected environment.

After that, we will 
1. Back up configuration files for the selected environment ([learn more about backup & recover](#backup--recover)).
2. Create a new Teams app and a new AAD app (if needed) in the new M365 tenant. 
3. If the project requires Azure bot service, we will generate a new bot service name and save it as the value of "botServiceName" in `azure.parameters.{env}.json`. And then we will use this new name to provision a new Azure bot service in the selected resource group and the subscription since it is not allowed to edit the MicrosoftAppId of an existing Azure bot service. 
4. If the project requires AAD, `{env}.userdata` will be overwritten with the new client secret.


## Switch Azure subscription
### Provision in a remote environment

## Backup & Recover
### Backup
We will keep all backups in the .backup/.fx folder and name those backups with the current date and time in the format of YYYYMMDDHHMMSS (which is the value of "time" mentioned below) when a backup happens. "env" below indicates the environment you select, which could be local or any remote environment.
* The backup of `state.{env}.json` will be `state.{env}.{time}.json` in the .backup/.fx/states folder which contains generated resources information of the local or remote environment.
* `azure.parameters.{env}.json` will be copied and saved to `azure.parameters.{env}.{time}.json` in the .backup/.fx/configs folder if your project contains Azure resources and you have selected a remote environment.
* The backup of `{env}.userdata` which exists when your project requires AAD will be `{env}.{time}.userdata` in the ./backup/.fx/statesfolder which contains secret information.

### Recover
If you want to switch back to the account or subscription and reuse resources that have been provisioned before:
* Sign in with the correct accounts and select the correct Azure subscription.
* Determine the date and time of the backup that you want to recover.
* Keep a copy of `state.{env}.json`, `azure.parameters.{env}.json` and `{env}.userdata`.
* Copy the content of `state.{env}.{time}.json` to `state.{env}.json`.    
Note: if you want to recover for a remote environment and you have added new features, please edit the value of "provisionSucceeded" to "false" to provision resources required for the newly added features.
* If `{env}.{time}.userdata` exists in the backup folder, replace the content of `{env}.userdata` with the content of `{env}.{time}.userdata`. 
* If you want to recover for a remote environment and your project previously contains Azure sources, update the value of "resourceBaseName" and "botServiceName"(delete this key if not exists) to the value defined in `azure.parameters.{env}.{time}.json`.
* Run provision and deploy again.    
* Delete the backup files when you think there is no need to keep them.

## Error
