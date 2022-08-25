# Embed Existing Web App

Embed existing web app is to bring your own static webpages and embed in Microsoft Teams.

## Get Started

Before run this app locally, make sure you have prepared the following prerequisites:
* An [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts).

Also, make sure your own static webpages meets the [prerequisites](https://aka.ms/teamsfx-embed-existing-web#prerequisites) and launches locally.

Then, you can quickly start local preview via the environment tree view in Teams Toolkit, refer [Preview your Teams app](https://aka.ms/teamsfx-embed-existing-web#preview-your-teams-app) for more information.

## Develop

The following table lists all the scaffolded folder and files by Teams Toolkit:

| File name | Contents |
|- | -|
|`.fx/configs/config.local.json`| Configuration file for local environment |
|`.fx/configs/config.dev.json`| Configuration file for dev environment |
|`.fx/configs/projectSettings.json`| Global project settings, which apply to all environments |
|`templates/appPackage/manifest.template.json`|Teams app manifest template|
|`templates/appPackage/resources`|Teams app's icon referenced by manifest template|
|`.gitignore` | The git ignore file to exclude local files from TeamsFx project |

### Edit Teams App manifest

You can find the Teams app manifest in `templates/appPackage/manifest.template.json`.

The file contains template arguments with `{...}` statements which will be replaced at build time. You may add any extra properties or permissions you require to this file. See the [schema reference](https://docs.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema) for more information.

## Deployment

Teams Toolkit can help provision new Teams app per different environments.

After provisioned, you can preview your app via the environment tree view in Teams Toolkit, refer [Preview your Teams app](https://aka.ms/teamsfx-embed-existing-web#preview-your-teams-app) for more information.

After finish development and to distribute your app to others, you can [Publish Teams apps using Teams Toolkit](https://docs.microsoft.com/microsoftteams/platform/toolkit/publish).

## Reference

* [Embed Existing Web App with Teams Toolkit](https://aka.ms/teamsfx-embed-existing-web)
* [Teams Toolkit and Step-by-step Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
* [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
* [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)