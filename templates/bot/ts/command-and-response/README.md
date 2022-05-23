# Responding to chat commands

The Command and Response feature enables register simple commands and respond to them with [adaptive cards](https://docs.microsoft.com/microsoftteams/platform/task-modules-and-cards/cards/cards-reference). This enables your users to type in simple messages in Teams and your application can provide an appropriate response based on the contents of the message.

This application is built with the [Microsoft Bot Framework](https://dev.botframework.com/) running on a restify server running on App Service along with the [Azure Bot Service](https://azure.microsoft.com/services/bot-services/).

Here is a screen shot of the application running:

![Command and Response in Teams](https://user-images.githubusercontent.com/11220663/165891754-16916b68-c1b5-499d-b6a8-bdfb195f1fd0.png)

# Getting Started

Run your app with local debugging by pressing `F5` in VSCode. Select `Debug (Edge)` or `Debug (Chrome)`.

**Congratulations**! You are running an application that can now send respond to a chat command in Teams.

>
> **Prerequisites**
>
> To run locally, you will need:
>
> - `Node.ts` installed locally (recommended version: 14)
> - An [M365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)
>

# Understanding the code

This section walks through the generated code. The project folder contains the following:

| Folder | Contents |
| - | - |
| `.fx` | Project level settings, configurations, and environment information |
| `.vscode` | VSCode files for local debug |
| `bot` | The source code for the command and response Teams application |
| `templates` | Templates for the Teams application manifest and for provisioning Azure resources |

The core command-response implementation is in `bot` folder.

The following files provide the business logic for command and response bot. These files can be updated to fit your business logic requirements. The default implementation provides a starting point to help you get started.

| File | Contents |
| - | - |
| `src/index.ts` | Application entry point and `restify` handlers for command and response |
| `src/adaptiveCards/helloworldCommand.json` | A generated Adaptive Card that is sent to Teams |
| `src/helloworldCommandHandler.ts` | The business logic to handle a command |
| `src/cardModels.ts` | The default Adaptive Card data model |

The following files implement the core command and response on the Bot Framework. You generally will not need to customize these files.

| File / Folder | Contents |
| - | - |
| `src/internal/initialize.ts` | Application initialization and bot message handling |

The following files are project-related files. You generally will not need to customize these files.

| File / Folder | Contents |
| - | - |
| `.gitignore` | Git ignore file |
| `package.json` | NPM package file |

# Customize your application

By default a single command is generated that sends the `hellowworldComnmand.json` Adaptive Card when a user types `hello` in the private message chat with the bot.

This section outlines some customization you can do to adopt the application for your needs.

## Customize the command logic

The default command logic simply returns a hard-coded Adaptive Card. You can customize this logic with your customize business logic. Often your business logic might require you to call your existing APIs.

Teams Toolkit enables you to [easily connect to an existing API](#connect-to-existing-apis).

## Customize the Adaptive Card

You can edit the file `src/adaptiveCards/helloworldCommand.json` to customize the Adaptive Card to your liking. The file `src/cardModels.ts` defines a data structure that is used to fill data for the Adaptive Card.

The binding between the model and the Adaptive Card is done by name matching (for example,`CardData.title` maps to `${title}` in the Adaptive Card). You can add, edit, or remove properties and their bindings to customize the Adaptive Card to your needs.

You can also add new cards if appropriate for your application. Please follow this [sample](https://aka.ms/teamsfx-adaptive-card-sample) to see how to build different types of adaptive cards with a list or a table of dynamic contents using `ColumnSet` and `FactSet`.

## Add more commands

A hello world command handler is generated in `bot/src/helloworldCommandHandler.ts` as an example. You can customize this command, or you can delete it and add more commands. To add more commands:

1. Create a new command handler class which implements the `TeamsFxBotCommandHandler` interface.
2. Register your command handler in `bot/src/internal/initialize.ts`.
    - Option 1: update the `ConversationBot` constructor in include your new command handler(s) in `options.command.commands`.
    - Option 2: call `ConversationBot.command.registerCommand(s)` to incrementally register your new command(s). 
3. Update the app's manifest template in `templates/appPackage/manifest.template.json` to include the command definition for the new command(s) in the `bots.commandLists` section. 

For more code snippets and details, refer to [this document](https://aka.ms/teamsfx-command-response#how-to-add-more-command-and-response).

## Add notifications to your application

The notification feature adds the ability for your application to send Adaptive Cards in response to external events. For example, when a message is posted to `Event Hub` your application can respond and send an appropriate Adaptive Card to Teams.

To add the notification feature:

1. Go to `bot\src\internal\initialize.ts`
2. Update your `conversationBot` initialization to enable notification feature:
    ![enable-notification](https://user-images.githubusercontent.com/10163840/165462039-12bd4f61-3fc2-4fc8-8910-6a4b1e138626.png)
3. To quickly add a sample notification triggered by a HTTP request, you can add the following sample code in `bot\src\index.ts`:

    ```typescript
    server.post("/api/notification", async (req, res) => {
      for (const target of await commandBot.notification.installations()) {
        await target.sendMessage("This is a sample notification message");
      }
    
      res.json({});
    });

4. Uninstall your previous bot installation from Teams, and press `F5` to start your application.
5. Send a notification to the bot installation targets (channel/group chat/personal chat) by using a your favorite tool to send a HTTP POST request to `https://localhost:3978/api/notification`.

To learn more, refer to [the notification document](https://aka.ms/teamsfx-notification).

## Access Microsoft Graph

If you are responding to a command that needs access to Microsoft Graph, you can leverage single sign on to leverage the logged-in Teams user token to access their Microsoft Graph data. Read more about how Teams Toolkit can help you [add SSO](https://aka.ms/teamsfx-add-sso) to your application.

## Connect to existing APIs

Often you need to connect to existing APIs in order to retrieve data to send to Teams. Teams Toolkit makes it easy for you to configure and manage authentication for existing APIs. 

For more information, [click here](https://aka.ms/teamsfx-connect-api).

## Customize the initialization

The default initialization is located in `bot/src/internal/initialize.ts`.

You can update the initialization logic to:

- Set `options.adapter` to use your own `BotFrameworkAdapter`
- Set `options.command.commands` to include more command handlers
- Set `options.{feature}.enabled` to enable more `ConversationBot` functionality

To learn more, visit [additional initialization customizations](https://aka.ms/teamsfx-command-response#customize-initialization).

## Update the Teams application manifest

You can find the Teams application manifest in `templates/appPackage/manifest.template.json`.

The file contains template arguments with `{...}` statements which will be replaced at build time. You may add any extra properties or permissions you require to this file.

See the [schema reference](https://docs.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema) for more information.

## Additional information

* Manage [multiple environments](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-multi-env)
* [Collaborate](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-collaboration) with others

# References

* [Teams Toolkit Command Bot Tutorial](https://aka.ms/teamsfx-command-response)
* [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
* [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
* [TeamsFx SDK](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-sdk)
* [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)