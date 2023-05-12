# Upgrade Summary

Congratulations! You can continue your development now. Your project has been upgraded to work with the latest Teams Toolkit.

Most of existing features behave similar with previous Teams Toolkit. You can visit https://aka.ms/teamsfx-v5.0-guide to learn the new features. And read [Important changes to your development flow](#important-changes-to-your-development-flow) to understand the changes to your development flow.

Visit https://aka.ms/teams-toolkit-5.0-upgrade to learn more about the upgrade.

## Important changes to your development flow

There's no immediate action required from you. This part illustrates what's changed to your development flow.
> If you encountered any errors or issues after upgrade, you could try the following steps or visit [known issues](https://aka.ms/teams-toolkit-5.0-upgrade#known-issues) for details.

1. You need to sync `env/.env.{env}.user` files between different machines manually. All these files will be gitignored by default. [Learn More](https://aka.ms/teams-toolkit-5.0-upgrade#environment-management)
2. You need to take some manual steps when creating or provisioning new environments for your old project. [Learn More](https://aka.ms/teams-toolkit-5.0-upgrade#environment-management)
3. You need to manually update `.vscode/launch.json` when launching your app for a certain environment if your current project contains it. [Learn More](https://aka.ms/teams-toolkit-5.0-upgrade#launch-your-app)
4. You need to provide values to `APIM__PUBLISHEREMAIL` and `APIM__PUBLISHERNAME` environment variable if your current project uses APIM. [Learn More](https://aka.ms/teams-toolkit-5.0-upgrade#provision-apim-service)
5. You need to manually update `Start local tunnel` task in `.vscode/task.json` if you have customized this task. Teams Toolkit now uses Dev Tunnel as default tunnel solution. [Learn More](https://aka.ms/teams-toolkit-5.0-upgrade#start-tunnel-service)

You can visit this [wiki](https://aka.ms/teams-toolkit-5.0-upgrade#feature-changes-that-impact-your-development-flow) to learn more changes to Teams Toolkit.

## Changes to your project

1. Created `teamsapp.yml` and `teamsapp.local.yml` in your project root folder.
2. Moved environment files in `.fx` to `.env.{env}` in `env` folder.
3. If your project contains file `.fx/states/{env}.userdata`, the content will be moved to `.env.{env}.user` in `env` folder
4. Moved `templates/appPackage` to `appPackage`, renamed `manifest.template.json` to `manifest.json` and placeholders in it will be updated per the latest Teams Toolkit requirement.
5. If your project contains file `templates/appPackage/aad.template.json`, it will be moved and renamed as `aad.manifest.json` and placeholders in it will be updated per the latest Teams Toolkit requirement.
6. If your project contains file `.vscode/tasks.json` and `.vscode/launch.json`, they will be updated.
7. Updated `.gitignore` to ignore new environment user files.
8. Removed `.fx` folder.

For more detailed changes, please refer to this [wiki](https://aka.ms/teams-toolkit-5.0-upgrade#file-changes).

## Known issues

1. If your project only contains a bot, you may meet error that complains `STATE__FX_RESOURCE_FRONTEND_HOSTING__ENDPOINT` is missing when executing commands. Replace this placeholder with a valid URL in `appPackage/manifest.json` to fix it. [Learn More](https://aka.ms/teams-toolkit-5.0-upgrade#state__fx_resource_frontend_hosting__endpoint-missing-error-in-some-projects)

2. If your project is created with Visual Studio version < 17.4, you may see error `InvalidParameter: Following parameter is missing or invalid for aadApp/create action: name` when executing commands. Please follow [the steps](#how-to-roll-back) to roll back, install VS 17.4 and run upgrade first.

3. If your tab app is created with Teams Toolkit 3.2.0 or earlier version, you may see error `simpleAuthEndpoint in configuration is invalid` when remote debugging your app. Please follow this [wiki](https://aka.ms/teams-toolkit-5.0-upgrade#simpleauthendpoint-in-configuration-is-invalid) to learn how to mitigate this error.
4. If your project can be provisioned successfully before, but after upgrade it cannot be provisioned or published by `teamsApp/validateAppPackage` actione, please use the [validation](https://dev.teams.microsoft.com/validation) to check your appPackage zip file and fix the error. [Learn More](https://aka.ms/teams-toolkit-5.0-upgrade#teamsappvalidateapppackage-failed-error)

## How to roll back

If you want to restore your project configuration after the upgrade is successful and continue to use old version Teams Toolkit, you can follow these steps:
1. Copy everything in `.backup` folder to your project root folder
2. Delete the new files mentioned in [Changes to your project](#changes-to-your-project) section

You can learn more details in this [wiki](https://aka.ms/teams-toolkit-5.0-upgrade#how-to-roll-back).