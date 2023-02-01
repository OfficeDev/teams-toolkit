# Upgrade Summary

Congratulations! Your project has been upgraded to work with latest Teams Toolkit. You can visit https://aka.ms/teamsfx-v5.0-guide to learn new features in Teams Toolkit. And visit https://aka.ms/teams-toolkit-5.0-upgrade to learn more about the upgrade.

## Changes to your project

1. Created `teamsapp.yml` and `teamsapp.local.yml` in your project root folder.
2. Moved environment files in `.fx` to `.env.{env}` in `env` folder.
3. Moved `templates/appPackage` to `appPackage` and updated placeholders in it per latest tooling's requirement.
4. Moved `templates/appPackage/aad.template.json` to `aad.manifest.template.json` and updated placeholders in it per latest tooling's requirement.
5. Updated `.vscode/tasks.json` and `.vscode/launch.json`.
6. Updated `.gitignore` to ignore new environment files.
7. Removed `.fx` folder.

For more detailed changes, please refer to this [wiki](https://aka.ms/teams-toolkit-5.0-upgrade#file-changes).

## Important changes to your development flow

1. All the environment files will be gitignored by default, you need to sync their content manually. [Learn More](https://aka.ms/teams-toolkit-5.0-upgrade#environment-management)
2. You need to take some manual steps when creating new environments for your old project. [Learn More](https://aka.ms/teams-toolkit-5.0-upgrade#environment-management)
3. You need to manually update `.vscode/launch.json` when launch your app for a certain environment. [Learn More](https://aka.ms/teams-toolkit-5.0-upgrade#launch-your-app)
4. You need to provide values to `APIM__PUBLISHEREMAIL` and `APIM__PUBLISHERNAME` environment variable if your current project uses APIM. [Learn More](https://aka.ms/teams-toolkit-5.0-upgrade#provision-apim-service)

You can visit this [wiki](https://aka.ms/teams-toolkit-5.0-upgrade#feature-changes-that-impact-your-development-flow) to learn more  changes to Teams Toolkit.

## Known issues

1. If your project only contains a bot, you may meet error that complains `STATE__FX_RESOURCE_FRONTEND_HOSTING__ENDPOINT` is missing when executing commands. Replace this placeholder with a valid URL in `appPackage/manifest.template.json` to fix it. [Learn More](https://aka.ms/teams-toolkit-5.0-upgrade#state__fx_resource_frontend_hosting__endpoint-missing-error-in-some-projects)

## Restore your project configuration

If you want to restore your project configuration after the upgrade is successful and continue to use old version Teams Toolkit, you can follow these steps:
1. Copy everything in `.backup` folder to your project root folder
2. Delete the new files mentioned in [Changes to your project](#changes-to-your-project) section

You can learn more details in this [wiki](https://aka.ms/teams-toolkit-5.0-upgrade#restore-your-project-configuration).