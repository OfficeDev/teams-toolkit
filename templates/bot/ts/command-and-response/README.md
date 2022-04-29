# Build command and response

Microsoft Teams allows you to automate simple and repetitive tasks right inside a conversation. You can build a Teams bot that responds to simple commands sent in chats with [cards](https://docs.microsoft.com/microsoftteams/platform/task-modules-and-cards/what-are-cards).

This template implements command and respond as Teams bot application. You can send a `helloWorld` command after running this template and get a response as below:

![Command and Response in Teams](https://user-images.githubusercontent.com/11220663/165891754-16916b68-c1b5-499d-b6a8-bdfb195f1fd0.png)

## Get Started

Before running this app locally, make sure you have prepared these prerequisites:

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
| `src/internal/initialize.ts` | Generated initialize code for initialize the command bot |
| `src/helloworldCommandHandler.ts` | A hello world command handler to process a hello world command and return an adaptive card as response |
| `src/index.ts` | The entrypoint to handle bot messages and send response |
| `.gitignore` | The git ignore file to exclude local files from bot project |
| `package.json` | The NPM package file for bot project |

### Initialization

The default initialization is located in `bot/src/internal/initialize.ts`, which creates a default [Bot Framework adapter](https://docs.microsoft.com/javascript/api/botbuilder/botframeworkadapter?view=botbuilder-ts-latest) and sets up the TeamsFx command bot. You can also add your own initialization logic here to:

- Set `options.adapter` to use your own `BotFrameworkAdapter` with additional bot logic
- Set `options.command.commands` to include more command handlers.
- Set `options.{feature}.enabled` to enable more functionalities of `ConversationBot`.

### Add more commands

A hello world command handler is generated in `bot/src/helloworldCommandHandler.ts` to help you getting started easily, and you can add more commands to your bot with the following steps: 

1. Create a new command handler class which implements the `TeamsFxBotCommandHandler` interface.
2. Register the instance of your command handler into your command bot in `bot/src/internal/initialize.ts`.
    - Option 1: update the `ConversationBot` constructor in include your new command handler(s) in `options.command.commands`.
    - Option 2: call `ConversationBot.command.registerCommand(s)` to incrementally register your new command(s). 
3. Update the app's manifest template in `templates/appPackage/manifest.template.json` to include the command definition for newly added commands in the `bots.commandLists` section. 

For more code snippets and details, you can also refer to [this document](https://aka.ms/teamsfx-command-response#how-to-add-more-command-and-response).

### Extend command bot to send notification

1. Go to `bot\src\internal\initialize.ts(js)`, update your `conversationBot` initialization to enable notification feature:

    ![enable-notification](https://user-images.githubusercontent.com/10163840/165462039-12bd4f61-3fc2-4fc8-8910-6a4b1e138626.png)

2. Follow [this instruction](https://aka.ms/teamsfx-notification#notify) to send notification to the bot installation target (channel/group chat/personal chat). To quickly add a sample notification triggered by a HTTP request, you can add the following sample code in `bot\src\index.ts(js)`:

    ```typescript
    server.post("/api/notification", async (req, res) => {
      for (const target of await commandBot.notification.installations()) {
        await target.sendMessage("This is a sample notification message");
      }
    
      res.json({});
    });

3. Uninstall your previous bot installation from Teams, and re-run local debug to test your bot notification. Then you can send a notification to the bot installation targets (channel/group chat/personal chat) by using a HTTP POST request with target URL `https://localhost:3978/api/notification`.

To explore more details of the notification feature (e.g. send notification with adaptive card, add more triggers), you can further refer to [the notification document](https://aka.ms/teamsfx-notification).

### Build adaptive card with dynamic content

Adaptive card provides [Template Language](https://docs.microsoft.com/adaptive-cards/templating/) to allow users to render dynamic content with the same layout (the template). For example, use the adaptive card to render a list of items (todo items, assigned bugs, etc) that could varies according to different user.

1. Add your adaptive card template JSON file under `bot/adativeCards` folder
1. Import the card template to you code file where your command handler exists (e.g. `myCommandHandler.ts`)
1. Model your card data
1. Use `MessageBuilder.attachAdaptiveCard` to render the template with dynamic card data

### Connect to existing API

You usually want to access data or information when building Teams application. If you do not have an appropriate SDK that helps you make an API request, Teams Toolkit is here to help you bootstrap sample code which handles authentication for your API requests. For more information, you can visit [Connect existing API document](https://aka.ms/teamsfx-connect-api).

### Add single sign on

If you are responding to a command that need to access user data or information, you can leverage single sign on to provide a smooth experience. Read more about how Teams Toolkit can help you [add sso](https://aka.ms/teamsfx-add-sso) incrementally to your command and response bot.

### Edit Teams App manifest

You can find the Teams app manifest in `templates/appPackage/manifest.template.json`.

The file contains template arguments with `{...}` statements which will be replaced at build time. You may add any extra properties or permissions you require to this file. See the [schema reference](https://docs.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema) for more information.

### More development documentations

* Manage [multiple environments](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-multi-env)
* [Collaborate](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-collaboration) with others

## Deployment

Teams Toolkit simplifies the process for you when moving this application to the cloud.
* Provision cloud resource for your app using ARM templates, see: [Use Teams Toolkit to provision cloud resources](https://docs.microsoft.com/microsoftteams/platform/toolkit/provision) for more information.
* Deploy your application to the cloud with a single command see: [Deploy to the cloud](https://docs.microsoft.com/microsoftteams/platform/toolkit/deploy).
* Set up automation pipelines with [CI/CD support](https://docs.microsoft.com/microsoftteams/platform/toolkit/use-cicd-template).
* With your application running in the cloud, preview your app in Teams via [Run the deployed app](https://docs.microsoft.com/microsoftteams/platform/sbs-gs-javascript?tabs=vscode%2Cvsc%2Cviscode%2Cvcode&tutorial-step=8#run-the-deployed-app).
* Distribute your application by [Publish Teams apps using Teams Toolkit](https://docs.microsoft.com/microsoftteams/platform/toolkit/publish).

## Reference

* [Teams Toolkit Command Response Bot](https://aka.ms/teamsfx-command-response)
* [Teams Bot Command Menus](https://docs.microsoft.com/microsoftteams/platform/bots/how-to/create-a-bot-commands-menu?tabs=desktop%2Cjavascript)
* [Bot Basics](https://docs.microsoft.com/azure/bot-service/bot-builder-basics?view=azure-bot-service-4.0)
* [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
* [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
* [TeamsFx SDK](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-sdk)
* [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)