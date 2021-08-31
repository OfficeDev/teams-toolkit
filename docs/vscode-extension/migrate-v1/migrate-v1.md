# Overall
Teams toolkit can migrate the projects created before v2.0.0 and continue to develop your project with the latest Teams Toolkit.

You can debug your application by pressing F5. If you wish to host your application in Azure, we recommend you to re-create your project directly using the latest Teams Toolkit.

To understand more about the migration, you can read the readme file listed below to get further information.
- [How to migrate Teams Toolkit V1 tab project](./migrate-v1-tab.md)
- [How to migrate Teams Toolkit V1 bot / message extension poject](./migrate-v1-bot.md)

## Limitations
There are some limitations to migrate the Teams Toolkit V1 projects.
- Only the projects created after Teams Toolkit v1.2.0 are supported.
- The bot / message extension + SSO (Single sign-on) project hasn't been supported yet.
- The tab + SSO (Single sign-on) project need some manual configuration steps.

## Rollback
All the files of the origin project are archived to the `.archive` folder. The archive log file `.archive.log` provide detail information about the archive process.
We recommend to use git for better tracking file changes before migration.



