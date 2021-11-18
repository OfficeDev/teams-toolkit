# Change Logs for Project Structure Upgrade
Congratulations! You have successfully upgraded your Teams App project structure. We have updated the configuration files so that your project is compatible with the latest Teams Toolkit features, including using the IaC approach for resource provision with pre-cooked ARM templates tailored to your project and defining multiple environments within the project.

## Know about the changes we made

### Project Configuration Files
The existing project configuration files under the `.fx` folder are outdated and incompatible with the current version of Teams Toolkit. So some clean-ups are made and now your `.fx` folder will consist:
* Parameters for Provisioning Azure Resource, specific for each environment.
* Configurations for Manifest, AAD, etc, specific for each environment.
* Project Settings, including capabilities, programming languages, etc.
* Local Settings, including necessary information to start debugging the project locally.

We will update those files according to your original project settings and move existing ones into `.backup` folder for your reference. You can safely delete the `.backup` folder after you have compared and reviewed the changes.

### ARM Templating and Resource Configuration Files
Teams Toolkit now supports provision Azure resources using an Infrastructure as Code approach, pre-cooked ARM templates tailored to your project will be automatically added under the `templates/azure` folder. The ARM templates are authored using [Bicep](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview).

#### Azure API Management (APIM)
For project contains APIM cloud resource, if you have already successfully provisioned APIM services before upgrade project, you should noted that **SKU**, **publisher email** and **publisher name** properties for APIM service will be updated based on the definition in *./templates/azure/provision/apim.bicep*, which might not be the same as your previous setting. If you prefer to keep previous values, you can customize the bicep file / parameter files. Refer to this [this GitHub wiki](https://aka.ms/teamsfx-migration-guide#manual-work-to-customize-apim) on how to customize bicep files.

### Environment Specific Configuration Files
Teams Toolkit now supports creating multiple environments for a project, and you can customize the configurations for a specific environment, for example using different app names in the manifest for different environments. You can read more about what you can do in [this wiki](https://github.com/OfficeDev/TeamsFx/wiki/Enable-Preview-Features-in-Teams-Toolkit#managing-multiple-environments-in-teams-toolkit).

## Know what you need to do
### Provision resource with bot
If you have already provisioned the bot service before the migration, and you want to continue to use the bot service after the migration, please provision again. We will create a new bot service for this project, and other resources will not change. You can [read more](https://aka.ms/teamsfx-migration-guide#required-steps-after-migration) about why you need re-prevision.

### Use exsiting bot
If you want to reuse the existing bot that has been provision, please follow [this step](https://aka.ms/teamsfx-migration-guide#manual-work-to-use-existing-bot).
## Restore Your Project Configurations
Read this [wiki](https://aka.ms/teamsfx-migration-guide) if you want to restore your configuration files or learn more about this upgrade.