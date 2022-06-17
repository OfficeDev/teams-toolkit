# Congratulations! You have successfully upgraded your Teams App project structure.

We have updated the configuration files so that your project is compatible with the latest Teams Toolkit features, including add a AAD manifest template file.

> Import Notes: If you collaborate on this project with your co-workers, and his teams toolkit extension version <= 3.7.0, please ensure your team members update the Teams Toolkit extension to the latest version after committing the changes with this upgrade.

## Why upgrade
Teams Toolkit continues to improve your Teams application development experience. We are upgrading the Teams app project structure so that you can:

1. Use AAD manifest template to customize your AAD app.
1. Allow to add single sign-on (SSO) feature for Bot (hosting on Azure App Service), Messaging Extension, Static Launch Page, and Embed existing web App

## Know about the changes we made
After the project upgrade, there are following changes we made:
1. Update `.fx\configs\projectSettings.json` capabilities to include TabSSO and/or BotSSO based on original project capabilities.
1. AAD manifest template file will be added to `templates\appPackage\aad.template.json`
1. The required resource access information in `permissions.json` file will be merged into `aad.template.json` file and `permissions.json` file will be deprecated, please customize `requiredResourceAccess` property in `aad.template.json` file.

## Know about how to restore your project
If anything went wrong after the upgrade process, you could restore your old project configuration files by:
* Copy the .backup/.fx folder to your project root path.
* Delete `templates\appPackage\aad.template.json` file if needed





