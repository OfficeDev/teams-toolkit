# Upgrade Summary

Congratulations! Your project has been upgraded to work with latest Teams Toolkit. You can visit https://aka.ms/teamsfx-v5.0-guide to learn new features in Teams Toolkit.

## Changes to your project

1. Moved everything in `.fx` to `teamsfx` folder with new file format.
    * Created new `app.yml` and `app.local.yml` files in `teamsfx` folder
    * Moved contents in `state.{env}.json`, `config.{env}.json` and `{env}.userdata` to `.env.{env}` in `teamsfx` folder
2. Moved `templates/appPackage` to `appPackage` and update placeholders in it per latest tooling's requirement.
3. Moved `templates/appPackage/aad.template.json` to `aad.manifest.template.json` and update placeholders in it per latest tooling's requirement.
4. Updated `.vscode/tasks.json` and `.vscode/launch.json`.
5. Updated `.gitignore` to ignore new environment files in `teamsfx` folder.

For more detail changes, please refer to [this wiki](https://aka.ms/teams-toolkit-5.0-upgrade).

## Changes to existing features in VS Code Teams Toolkit

If you're using VS Code Teams Toolkit, there're some changes to existing features you should be aware of:

### Environment management
1. All the environment files will be gitignored by default.
2. When creating new environments, you need to fill customized fields in the new `.env.{env_name}` file. Usually you need to provide values for all environment values with `CONFIG__` prefix.
3. When creating new environments, you need to manually create `templates/azure/azure.parameters.{env_name}.json` as Azure provision parameters and fill the parameter values accordingly.

### Launch your app
1. When launching your app for a remote environment, Teams Toolkit will no longer ask you to select an environment. You need to manually change environment name for `${dev:teamsAppId}` in `.vscode/launch.json` to launch your app for a certain environment.

### Provision SQL databases
1. When you provision a new environment, you need to provide values for `STATE__FX_RESOURCE_AZURE_SQL__ADMIN` and `SECRET_FX_RESOURCE_AZURE_SQL__ADMINPASSWORD` in `.env.{env_name}` which are required inputs for creating SQL databases.
    > If you're provisioning an existing environment, you don't need this step.
2. You need to grant permission to user assigned identity manually after provisioning a new environment. This [document](https://aka.ms/teamsfx-add-azure-sql) includes tutorials about how to access SQL databases using user assigned identity.

### Provision APIM service
1. When you provision an environment, you need to provide values for `APIM__PUBLISHEREMAIL` and `APIM__PUBLISHERNAME` in `.env.{env_name}` which are required inputs for creating or updating APIM services.
2. You need to manually create an Azure Active Directory app for APIM service when provisioning a new environment. This [document](https://aka.ms/teamsfx-add-azure-apim) includes tutorials about how to create an Azure Active Directory app for APIM service.
3. Teams Toolkit no longer support deploy API spec to APIM any more.