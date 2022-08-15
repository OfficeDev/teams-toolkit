# Congratulations! You are now switching to another tenant or subscription. Configuration files for last provision/local debug are saved successfully.

You are now using a different Microsoft 365 account(M365) or Azure subscription from what you previously used. We have backed up the configuration files which are used for or generated from previous provision/local debug. For more information, you can check this [doc](https://aka.ms).

## Why backup
Configuration files will be overwritten by Teams Toolkit when provisioning in an already-provisioned environment but with different account information or local debugging again with another Microsoft 365 account. We will back up those files so that you could continue using the resources created before easily when you decied to switch back to the accounts or subscription that you used before and would like to keep using these resources. Otherwise, all kind of resources will be provisioned again but with different resource names.

## Know about the files we backed up
We will keep all backups under .backup/.fx folder and we will name those backups with the current date and time in the format of YYYYMMDDHHMMSS when backup happens.
* The backup of `state.{env}.json` will be `state.{env}.{time}.json` in .backup/.fx folder which contains generated resources information of the local or remote environment.
* `azure.parameters.{env}.json` {if exists} will copied and saved to `azure.parameters.{env}.{time}.json` in .backup/.fx folder if your project contains Azure resources and run provision in a remote environment.
* The backup of `{env}.userdata` (if exists) will be `{env}.{time}.userdata` which contains secret information.

## Know about how to restore from the backup
If you want to switch back to the account or subscription which contains resources have been provisioned before:
* Sign in with the correct accounts and select the correct Azure subscription.
* Keep a copy of `state.{env}.json`, `azure.parameters.{env}.json` and `{env}.userdata`.
* Copy the content of `state.{env}.{time}.json` to `state.{env}.json`. Note: if you have added new features, please edit the value of "provisionSuccess" to "false" to provision resources required for the newly added features.
* If your project previously contains Azure sources, edit the value of "resourceBaseName" and "botServiceName"(if exists) to the value defined in `azure.parameters.{env}.{time}.json`.
* If `{env}.{time}.userdata` exists in the backup folder, replace the content of `{env}.userdata` with the content of`{env}.{time}.userdata`.   
* Run provision and deploy again.    
* Delete the backup files when you think there is no need to keep them.
