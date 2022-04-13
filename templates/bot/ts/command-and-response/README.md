# Command and Response Bot

A command and response bot is an app that responds to simple commands sent in Teams chat and replies a result in meaningful ways.

## Get Started

Before run this app locally, make sure you have prepared these prerequisites:

- Node.js (Recommended version is 14)
- An [M365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)

Then, you can quickly start local debugging via `F5` in VSCode. Select `Debug (Edge)` or `Debug (Chrome)` debug option of your preferred browser.

## Develop

This new project folder structure looks like:

| Folder | Contents |
| - | - |
| `.fx` | Project level settings, configurations, and environment information |
| `.vscode` | Visual Studio Code files for local debug |
| `bot` | The bot source code |
| `templates` |Templates for Teams app manifest and corresponding Azure resources|

The core command-response implementation is in `bot/` folder, containing following content:

| File / Folder | Contents |
| - | - |
| `src/adaptiveCards/` | Adaptive card templates |
| `src/internal/initialize.ts(js)` | Generated initialize code for initialize the command bot |
| `src/helloworldCommandHandler.ts` | A hello world command handler to process a helloworld command and return an adaptive card as response |
| `src/index.ts(js)` | The entrypoint to handle bot messages and send response |
| `.gitignore` | The git ignore file to exclude local files from bot project |
| `package.json` | The NPM package file for bot project |

### Bot Initialization

The default initialization is located in `bot/src/internal/initialize.ts(js)`, which creates a default [Bot Freamework adapter](https://docs.microsoft.com/en-us/javascript/api/botbuilder/botframeworkadapter?view=botbuilder-ts-latest) and sets up the TeamsFx command bot. You can also add your own initialization logic here to:

- Set `options.adapter` to use your own `BotFrameworkAdapter` with additional bot logic
- Set `options.command.commands` to include more command handlers.
- Set `options.{feature}.enabled` to enable more functionalities of `ConversationBot`.

### Add More Commands

A helloworld command handler is generated in `bot/src/helloworldCommandHandler.ts(js)` to help you getting started easily, and you can add more commands to your bot with the following steps: 

1. Create a new command handler class which implements the `TeamsFxBotCommandHandler` interface.
2. Register the instance of your command handler into your command bot in `bot/src/internal/initialize.ts(js)`.
    - Option 1: update the `ConversationBot` constructor in include your new command handler(s) in `options.command.commands`.
    - Option 2: call `ConversationBot.command.registerCommand(s)` to incrementally register your new command(s). 
3. Update the app's manifest template in `templates/appPackage/manifest.template.json` to include the command definition for newly added commands in the `bots.commandLists` section. 

For more code snippets and details, you can also refer to [this document](https://aka.ms/teamsfx-command-response#how-to-add-more-command-and-response).

### Edit Teams App manifest

You can find the Teams app manifest in `templates/appPackage/manifest.template.json`.

The file contains template arguments with `{...}` statements which will be replaced at build time. You may add any extra properties or permissions you require to this file. See the [schema reference](https://docs.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema) for more information.

## Deployment

Teams Toolkit can help provision cloud resource for your app, refer [Use Teams Toolkit to provision cloud resources](https://docs.microsoft.com/microsoftteams/platform/toolkit/provision) for more information.

After provisioned, you can deploy your code to cloud, see [Deploy to the cloud](https://docs.microsoft.com/microsoftteams/platform/toolkit/deploy).

Then, you can preview your app via [Run the deployed app](https://docs.microsoft.com/microsoftteams/platform/sbs-gs-javascript?tabs=vscode%2Cvsc%2Cviscode%2Cvcode&tutorial-step=8#run-the-deployed-app).

After finish development and to distribute your app to others, you can [Publish Teams apps using Teams Toolkit](https://docs.microsoft.com/microsoftteams/platform/toolkit/publish).

## Reference

[Teams Toolkit Command Response Bot](https://aka.ms/teamsfx-command-response)

[Teams Bot Command Menus](https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/create-a-bot-commands-menu?tabs=desktop%2Cjavascript)

[Bot Basics](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-basics?view=azure-bot-service-4.0)

[Teams Toolkit and Step-by-step Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)

[Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)

[TeamsFx SDK](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-sdk)

[Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)