# Responding to card actions

The Adaptive Card action handler feature enables the app to respond to adaptive card actions that triggered by end users to complete a sequential workflow. When user gets an Adaptive Card, it can provide one or more buttons in the card to ask for user's input, do something like calling some APIs, and then send another adaptive card in conversation to response to the card action.

This application is built with the [Microsoft Bot Framework](https://dev.botframework.com/) running on a restify server running on App Service along with the [Azure Bot Service](https://azure.microsoft.com/services/bot-services/).


# Getting Started

Run your app with local debugging by pressing `F5` in VSCode. Select `Debug (Edge)` or `Debug (Chrome)`.

**Congratulations**! You are running an application that can now send respond to a chat command in Teams.

>
> **Prerequisites**
>
> To run locally, you will need:
>
> - `Node.js` installed locally (recommended version: 14)
> - An [M365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)
>
> **Note**
>
> Your app can be installed into a team, or a group chat, or as personal app. See [Installation and Uninstallation](https://aka.ms/teamsfx-command-response#customize-installation).
>

# Understanding the code

This section walks through the generated code. The project folder contains the following:

| Folder | Contents |
| - | - |
| `.fx` | Project level settings, configurations, and environment information |
| `.vscode` | VSCode files for local debug |
| `bot` | The source code for the workflow bot Teams application |
| `templates` | Templates for the Teams application manifest and for provisioning Azure resources |

The core command-response implementation is in `bot` folder.

The following files provide the business logic for the workflow bot. These files can be updated to fit your business logic requirements. The default implementation provides a starting point to help you get started.

| File | Contents |
| - | - |
| `src/index.js` | Application entry point and `restify` handlers for the workflow bot |
| `src/adaptiveCards/helloworldCommand.json` | A generated Adaptive Card that is sent to Teams |
| `src/commands/helloworldCommandHandler.js` | Responds to the command message |
| `src/cardActions/doStuffActionHandler.js` | Responds to the `doStuff` card action |

The following files implement the core workflow bot on the Bot Framework. You generally will not need to customize these files.

| File / Folder | Contents |
| - | - |
| `src/internal/initialize.js` | Application initialization and bot message handling |

The following files are project-related files. You generally will not need to customize these files.

| File / Folder | Contents |
| - | - |
| `.gitignore` | Git ignore file |
| `package.json` | NPM package file |

# Customize your application

By default a single command is generated that sends the `helloworldCommand.json` Adaptive Card when a user types `hello` in the private message chat with the bot.

This section outlines some customization you can do to adopt the application for your needs.

## Customize the command logic

The default command logic simply returns a hard-coded Adaptive Card. You can customize this logic with your customize business logic. Often your business logic might require you to call your existing APIs.

Teams Toolkit enables you to [easily connect to an existing API](#connect-to-existing-apis).

## Customize the Adaptive Card

You can edit the file `src/adaptiveCards/helloworldCommand.json` to customize the Adaptive Card to your liking. 

The binding between the model and the Adaptive Card is done by name matching (for example, `cardData.title` maps to `${title}` in the Adaptive Card). You can add, edit, or remove properties and their bindings to customize the Adaptive Card to your needs.

You can also add new cards if appropriate for your application. Please follow this [sample](https://aka.ms/teamsfx-adaptive-card-sample) to see how to build different types of adaptive cards with a list or a table of dynamic contents using `ColumnSet` and `FactSet`.

## Add more card actions

You can use the following 4 steps to add more card action:
1. [Step 1: add an action to your Adaptive Card](#step-1-add-an-action-to-your-adaptive-card)
2. [Step 2: add adaptive card for action response](#step-2-add-adaptive-card-for-action-response)
3. [Step 3: add action handler](#step-3-add-action-handler)
4. [Step 4: register the action handler](#step-4-register-the-action-handler)

### Step 1: add an action to your Adaptive Card

Here's a sample action with type `Action.Execute`:
```json
{ 
  "type": "AdaptiveCard", 
  "body": [
    ...
    {
      "type": "ActionSet",
      "actions": [
        {
          "type": "Action.Execute",
          "title": "DoStuff",
          "verb": "doStuff" 
        }
      ]
    }
  ]
  ... 
} 
```

`Action.Execute` invoking the bot can return Adaptive Cards as a response, which will replace the existing card in conversation by default.  

### Step 2: add adaptive card for action response
For each action invoke, you can return a new adaptive card to display the response to end user. You can use [adaptive card designer](https://adaptivecards.io/designer/) to design your card layout according to your business needs.

To get-started, you can just create a sample card (`responseCard.json`) with the following content, and put it in `bot/src/adaptiveCards` folder:

```json
{
  "type": "AdaptiveCard",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "This is a sample action response."
    }
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4"
}
```

### Step 3: add action handler 

Add handler to implements `TeamsFxAdaptiveCardActionHandler` to process the logic when corresponding action is executed.

Please note:
* The `triggerVerb` is the `verb` property of your action. 
* The `actionData` is the data associated with the action, which may include dynamic user input or some contextual data provided in the `data` property of your action.
* If an Adaptive Card is returned, then the existing card will be replaced with it by default.

```javascript
const { AdaptiveCards } = require("@microsoft/adaptivecards-tools");
const { AdaptiveCardResponse, InvokeResponseFactory } = require("@microsoft/teamsfx");
const responseCard = require("../adaptiveCards/responseCard.json");

export class Handler1 { 
    triggerVerb = "doStuff";

    async handleActionInvoked(context, message) { 
        const responseCardJson = AdaptiveCards.declare(responseCard).render(actionData);
        return InvokeResponseFactory.adaptiveCard(responseCardJson);
    } 
} 
```

> Note: you can follow [this section](#customize-card-action-handler) to customize the card action handler according to your business need. 

### Step 4: register the action handler

1. Go to `bot/src/internal/initialize.js`;
2. Update your `conversationBot` initialization to enable cardAction feature and add the handler to `actions` array:

```javascript
const conversationBot = new ConversationBot({ 
  ... 
  cardAction: { 
    enabled: true, 
    actions: [ 
      new Handler1() 
    ], 
  } 
}); 
```

For more code snippets and details, refer to [this document](https://aka.ms/teamsfx-card-action-response#).

## Add notifications to your application

The notification feature adds the ability for your application to send Adaptive Cards in response to external events. For example, when a message is posted to `Event Hub` your application can respond and send an appropriate Adaptive Card to Teams.

To add the notification feature:

1. Go to `bot\src\internal\initialize.js`
2. Update your `conversationBot` initialization to enable notification feature:

```javascript
const conversationBot = new ConversationBot({ 
  ... 
  cardAction: { 
    enabled: true, 
    actions: [ 
      new Handler1() 
    ], 
  },
  notification: {
    enabled: true
  } 
}); 
```

3. To quickly add a sample notification triggered by a HTTP request, you can add the following sample code in `bot\src\index.js`:

    ```javascript
    server.post("/api/notification", async (req, res) => {
      for (const target of await conversationBot.notification.installations()) {
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

The default initialization is located in `bot/src/internal/initialize.js`.

You can update the initialization logic to:

- Set `options.adapter` to use your own `BotFrameworkAdapter`
- Set `options.command.commands` to include more command handlers
- Set `options.cardAction.actions` to include more action handlers
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

* [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
* [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
* [TeamsFx SDK](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-sdk)
* [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)