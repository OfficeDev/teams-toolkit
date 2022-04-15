# More Information

Your project have been initialized to continue local development with the latest Teams Toolkit local debug features.

> Note: If you wish to host your application in Azure, we recommend you to re-create your project directly using the latest Teams Toolkit.

## Debug

Start debugging the project by hitting the `F5` key in Visual Studio Code. Alternatively use the `Run and Debug Activity Panel` in Visual Studio Code and click the `Start Debugging` green arrow button.

### Know about project structure and file change

There are some configuration changed in your project to make it compatible with the latest Teams Toolkit. Your original project files are archived to the `.archive` folder. You can refer to `.archive.log` which provides detailed information about the archive process.

> Note: We recommend to use git for better tracking file changes before migration.

## Edit the manifest

You can find the Teams app manifest template in `./templates/appPackage/manifest.template.json`. It contains template arguments with `{...}` statements which will be replaced at build time. You may add any extra properties or permissions you require to this file. See the [schema reference](https://docs.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema) for more.

## Learn more

To understand more about what you can do after the migration, you can read the readme file listed below to get further information.

- [Migrate a tab app created by Teams Toolkit V1](https://aka.ms/teamsfx-migrate-v1-tab)
- [Migrate a bot or messaging extension app created by Teams Toolkit V1](https://aka.ms/teamsfx-migrate-v1-bot)
