# More Information

Your project is now initialized with Teams Toolkit! You can continue to develop your project with the latest Teams Toolkit features.

> **Note**: If you wish to host your application in Azure, we recommend you to re-create your project directly using the latest Teams Toolkit.

## Debug

Start debugging the project by hitting the `F5` key in Visual Studio Code. Alternatively use the `Run and Debug Activity Panel` in Visual Studio Code and click the `Start Debugging` green arrow button.

## Rollback

All the files of the origin project are archived to the `.archive` folder. The archive log file `.archive.log` provide detail information about the archive process.
We recommend to use git for better tracking file changes before migration.

## Edit the manifest

You can find the Teams manifest in `.fx/manifest.source.json`. It contains template arguments with `{...}` statements which will be replaced at build time. You may add any extra properties or permissions you require to this file. See the [schema reference](https://docs.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema) for more.

## Learn more

To understand more about what you can do after the migration, you can read the readme file listed below to get further information.

- [Teams Toolkit V1 tab app migration](https://github.com/OfficeDev/TeamsFx/blob/dev/docs/vscode-extension/migrate-v1/migrate-v1-tab.md)
- [Teams Toolkit V1 bot / message extension migration](https://github.com/OfficeDev/TeamsFx/blob/dev/docs/vscode-extension/migrate-v1/migrate-v1-bot.md)
