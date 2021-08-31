# Overall
Teams toolkit can migrate the projects created before v2.0.0 and continue to develop your project with the latest Teams Toolkit.

## Prerequisites
- [NodeJS](https://nodejs.org/en/)
- An M365 account. If you do not have M365 account, apply one from [M365 developer program](https://developer.microsoft.com/en-us/microsoft-365/dev-program)
- [Teams Toolkit Visual Studio Code Extension](https://aka.ms/teams-toolkit) 

##  Initialize V1 project with the latest Teams Toolkit
### How to migrate Teams Toolkit V1 project
- Open an existing V1 project in Visual Studio Code.
- From Visual Studio Code, open command palette and select `Teams: Initialize your project to work with the latest Teams Toolkit`
- Choose the capability from the prompts accoring to your project type 

### Limitations
There are some limitations to migrate the Teams Toolkit V1 projects.
- Only the projects created after Teams Toolkit v1.2.0 are supported.
- The bot / message extension + SSO (Single sign-on) project hasn't been supported yet.
- The tab + SSO (Single sign-on) project need some manual configuration steps.

### Rollback
All the files of the origin project are archived to the `.archive` folder. The archive log file `.archive.log` provide detail information about the archive process.
We recommend to use git for better tracking file changes before migration.

## Learn more
To understand more about what you can do after the migration, you can read the readme file listed below to get further information.
- [Teams Toolkit V1 tab app migration](./migrate-v1-tab.md)
- [Teams Toolkit V1 bot / message extension migration](./migrate-v1-bot.md)
>**Note**: If you wish to host your application in Azure, we recommend you to re-create your project directly using the latest Teams Toolkit.




