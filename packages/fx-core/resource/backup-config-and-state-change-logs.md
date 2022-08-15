# Congratulations! You are now switching to another tenant or subscription. Configuration files for last provision/local debug are saved successfully.

You are now using a different Microsoft 365 account(M365) or Azure subscription from what you previously used. We have backed up the configuration files which are used for or generated from previous provision/local debug. For more information, you can check this [doc](https://aka.ms).

## Why backup
Configuration files might be overwritten by Teams Toolkit when run provision in an already-provisioned environment with different account information or local debug again but with another Microsoft 365 account since new resources will be provisoned within the newly selected M365 tenant or Azure subscription. We will back up those files so that you could restore to use the resources created before easily.

## Know about the files we backed up
We will keep all backups under .backup/.fx folder and we will keep name those backups with the current date and time in the format of YYYYMMDDHHMMSS when backup happens.
* The backup of `state.{env}.json` will be `state.{env}.{time}.json` in .backup/.fx folder which contains generated resources information of the local or remote environment.
* `azure.parameters.{env}.json` {if exists} will copied and saved to `azure.parameters.{env}.{time}.json` in .backup/.fx folder if your project contains Azure resources and run provision in a remote environment.
* The backup of `{env}.userdata` (if exists) will be `{env}.{time}.userdata` which contains secret information.

## Know about how to restore your project
If anything went wrong after the upgrade process, you could restore your old project configuration files by:
* Copy the .backup/.fx folder to your project root path.
* Copy the .backup/templates folder to your project root path.
* Delete `config.local.json`, `manifest.template.json` and `aad.template.json` (for project contains SSO feature) if needed.
