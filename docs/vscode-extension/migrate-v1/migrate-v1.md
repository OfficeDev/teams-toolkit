# Overall
Teams toolkit can migrate the projects created using earlier versions (before v2.0.0) and help you continue local development with the latest Teams Toolkit debug feature.
>Note: If you wish to host your application in Azure, we recommend you to re-create your project directly using the latest Teams Toolkit.

## Prerequisites
- [NodeJS](https://nodejs.org/en/)
- An M365 account. If you do not have M365 account, apply one from [M365 developer program](https://developer.microsoft.com/en-us/microsoft-365/dev-program)
- [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) 

##  Initialize V1 project with the latest Teams Toolkit
- Open an existing V1 project in Visual Studio Code.
- From Visual Studio Code, open the command palette and select: `Teams: Initialize your project to work with the latest Teams Toolkit`
- Choose the capability from the prompts according to your project capability.

### Limitations
The migration support for projects created by earlier versions of Teams Toolkit is undergoing, so please be advised on the following limitations:
- Only the projects created after Teams Toolkit v1.2.0 are supported.
- Support for the bot / messaging extension project with Single Sign-on feature included is undergoing.
- If your tab project include Single Sign-on feature, you will need some manual configuration setups.

### Know about project structure and file change
There will be some configuration change in your project to make it compatible with the latest Teams Toolkit. Your original project files are archived to the `.archive` folder. You can refer to `.archive.log` which provides detailed information about the archive process.

> Note: We recommend to use git for better tracking file changes before migration.

## Learn more
To understand more about what you can do after the migration, you can read the readme file listed below to get further information.
- [Teams Toolkit V1 tab app migration](./migrate-v1-tab.md)
- [Teams Toolkit V1 bot / messaging extension migration](./migrate-v1-bot.md)




