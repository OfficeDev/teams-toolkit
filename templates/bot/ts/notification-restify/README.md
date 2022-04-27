# Notification Bot

A notification bot is an app that proactively sends messages in Teams channel / group chat / personal chat.

For example, once triggered, it sends text, card, or other message(s) to Teams:

![Notification Message in Teams](images/notification-message.png)

## Get Started

Before run this app locally, make sure you have prepared these prerequisites:

- Node.js (Recommended version is 14)
- An [M365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)

Then, you can quickly start local debugging via `F5` in VSCode. Select `Debug (Edge)` or `Debug (Chrome)` debug option of your preferred browser.

> **Note**: This app will setup [Microsoft Bot Framework](https://dev.botframework.com/) or [Azure Bot Service](https://azure.microsoft.com/services/bot-services/) for further running.
>
> If your account has no access to such resource(s), there's an alternative way to send notification via **Incoming Webhook**.
>
> Try the Incoming Webhook sample via `Create a new Teams app` -> `Start from a sample` -> `Incoming Webhook Notification`. Or browse the code at our [Sample Repo](https://github.com/OfficeDev/TeamsFx-Samples), `incoming-webhook-notification` folder.

## Develop

This new project folder structure looks like:

| Folder | Contents |
| - | - |
| `.fx` | Project level settings, configurations, and environment information |
| `.vscode` | VSCode files for local debug |
| `bot` | The bot source code |
| `templates` |Templates for Teams app manifest and corresponding Azure resources|

The core notification implementation is in `bot/` folder, containing following content:

| File / Folder | Contents |
| - | - |
| `src/adaptiveCards/` | Adaptive card templates |
| `src/internal/` | Generated initialize code for notification functionality |
| `src/cardModels.*s` | Adaptive card data models |
| `src/index.*s` | The entrypoint to handle bot messages and send notifications |
| `.gitignore` | The git ignore file to exclude local files from bot project |
| `package.json` | The NPM package file for bot project |

Following lists how this app could be extended. **You can also find more code snippets and samples on [Notification Document](https://aka.ms/teamsfx-notification#how-to-send-more-notifications).**

### More initializations

The default initialization is located in `bot/src/internal/initialize.*s`, and you can also add your own initialization logic here to:

- Set `options.adapter` to use your own `BotFrameworkAdapter` with additional bot logic
- Set `options.notification.storage` to use your own `NotificationTargetStorage` for persistency on production environment
- Set `options.{feature}.enabled` to enable more functionalities of `ConversationBot`

### More notifications

The default notifying logic is located in `bot/src/index.*s`, and you can also customize the targets and messages:
- Use `target.type` to distinguish different targets
- Use `target.members()`, `target.channels()` to get more targets
- Send your own card message
- Send POST request to the `http://<bot-endpoint>/api/notification` with your favorite tools like postman.

### Edit Teams App manifest

You can find the Teams app manifest in `templates/appPackage/manifest.template.json`.

The file contains template arguments with `{...}` statements which will be replaced at build time. You may add any extra properties or permissions you require to this file. See the [schema reference](https://docs.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema) for more information.

## Add authentication for your notification API

The scaffolded notification API does not have authentication / authorization enabled. We suggest you add authentication / authorization for this API before using it for production purpose. Here're some common ways to add authentication / authorization for an API:

1. Use an API Key

2. Use an access token issued by [Azure Active Directory](https://docs.microsoft.com/en-us/azure/active-directory/authentication/)

There would be more authentication / authorization solutions for an API. You can choose the one that satisfies your requirement best.

## Deployment

Teams Toolkit can help provision cloud resource for your app, refer [Use Teams Toolkit to provision cloud resources](https://docs.microsoft.com/microsoftteams/platform/toolkit/provision) for more information.

After provisioned, you can deploy your code to cloud, see [Deploy to the cloud](https://docs.microsoft.com/microsoftteams/platform/toolkit/deploy).

Then, you can preview your app via [Run the deployed app](https://docs.microsoft.com/microsoftteams/platform/sbs-gs-javascript?tabs=vscode%2Cvsc%2Cviscode%2Cvcode&tutorial-step=8#run-the-deployed-app).

After finish development and to distribute your app to others, you can [Publish Teams apps using Teams Toolkit](https://docs.microsoft.com/microsoftteams/platform/toolkit/publish).

## Reference

* [Teams Toolkit Notification Tutorial](https://aka.ms/teamsfx-notification)
* [Teams Toolkit and Step-by-step Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
* [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
* [TeamsFx SDK](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-sdk)
* [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)