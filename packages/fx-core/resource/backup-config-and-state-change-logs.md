# Congratulations! You are now switching to another tenant or subscription. Configuration files for last provision/local debug are saved successfully.

You are now using a different Microsoft 365 account(M365) or Azure subscription for the provision or local debug from what you previously used. We have backed up the configuration files which are used for or generated from previous provision or local debug. For more information, you can check this [doc](https://aka.ms).

## Why backup
Configuration files will be overwritten by Teams Toolkit when provisioning in an already-provisioned environment but with different account or Azure subscription or local debugging again with another Microsoft 365 account. We will back up those files so that you could continue using the resources created before easily when you decide to switch back to the accounts or the subscription that you selected before. Otherwise, all kinds of resources will be provisioned again but with different resource names, and you have to delete the old resources manully to avoid costs.

## Know about the files we backed up
We will keep all backups in the .backup/.fx folder and name those backups with the current date and time in the format of YYYYMMDDHHMMSS (which is the value of "time" mentioned below) when a backup happens. "env" below indicates the environment you select, which could be local or any remote environment.
* The backup of `state.{env}.json` will be `state.{env}.{time}.json` in the .backup/.fx/states folder which contains generated resources information of the local or remote environment.
* `azure.parameters.{env}.json` {if exists} will be copied and saved to `azure.parameters.{env}.{time}.json` in the .backup/.fx/configs folder if your project contains Azure resources.
* The backup of `{env}.userdata` (if exists) will be `{env}.{time}.userdata` in the ./backup/.fx/statesfolder which contains secret information.

## Know about how to restore from the backup
If you want to switch back to the account or subscription and reuse resources that have been provisioned before:
* Sign in with the correct accounts and select the correct Azure subscription.
* Determine the date and time of the backup that you want to recover.
* Keep a copy of `state.{env}.json`, `azure.parameters.{env}.json` and `{env}.userdata`.
* Copy the content of `state.{env}.{time}.json` to `state.{env}.json`. Note: if you have added new features, please edit the value of "provisionSucceeded" to "false" to provision resources required for the newly added features.
* If your project previously contains Azure sources, edit the value of "resourceBaseName" and "botServiceName"(delete this key if not exists) to the value defined in `azure.parameters.{env}.{time}.json`.
* If `{env}.{time}.userdata` exists in the backup folder, replace the content of `{env}.userdata` with the content of `{env}.{time}.userdata`.   
* Run provision and deploy again.    
* Delete the backup files when you think there is no need to keep them.
