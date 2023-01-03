# Overview of the Command bot template

This project template helps you get started with a Teams app that can respond to customized chat messages. In the example code, you'll find a single `helloWorld` command defined that the bot responds to with UI that's created using an Adaptive Card - a JSON object and format that helps developers exchange UI content.

The project template is a Node.js application that uses Restify to serve HTTP responses. It uses the `@microsoft/teamsfx` SDK to interact with Microsoft Bot Framework.

## Get Started with the Command bot

>
> **Prerequisites**
>
> To run the command bot template in your local dev machine, you will need:
>
> - `Node.js` installed locally (recommended version: 16)
> - An [Microsoft 365 account for development](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts)
>
> **Note**
>
> Your app can be installed into a team, a group chat, or as a personal app. See [Installation and Uninstall](https://aka.ms/teamsfx-command-response#customize-installation).
>

1. First, select the Teams Toolkit icon on the left in the VS Code toolbar.
2. In the Account section, sign in with your [Microsoft 365 account](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts) if you haven't already.
3. Press F5 to start debugging and launch your app in Teams using a web browser.
4. When Teams launches in the browser, select the Add button in the dialog to install your app to Teams.
5. Type or select `helloWorld` in the chat to send it to your bot - this is the default command provided by the template.

The bot will respond to the `helloWorld` command with an Adaptive Card:

![Command and Response in Teams](https://user-images.githubusercontent.com/11220663/165891754-16916b68-c1b5-499d-b6a8-bdfb195f1fd0.png)

## What's included in the template

| Folder | Contents |
| - | - |
| `.fx` | Project level settings, configurations, and environment information |
| `.vscode` | VSCode files for local debug |
| `bot` | The source code for the command and response Teams application |
| `templates` | Templates for the Teams application manifest and for provisioning Azure resources |

## Extend the command bot template with more commands and responses

Follow the steps below to add more commands and responses to extend the command bot:

1. [Step 1: Add a command definition in manifest](#step-1-add-a-command-definition-in-manifest)
2. [Step 2: Respond with an Adaptive Card](#step-2-respond-with-an-adaptive-card)
3. [Step 3: Handle the command](#step-3-handle-the-command)
4. [Step 4: Register the new command](#step-4-register-the-new-command)

### Step 1: Add a command definition in manifest

You can edit the manifest template file `templates\appPackage\manifest.template.json` to include definitions of a `doSomething` command with its title and description in the `commands` array:

```json
"commandLists": [
  {
    "commands": [
        {
            "title": "helloWorld",
            "description": "A helloWorld command to send a welcome message"
        },
        {
            "title": "doSomething",
            "description": "A sample do something command"
        }
    ]
  }
]
```

### Step 2: Respond with an Adaptive Card

To respond with an Adaptive Card, define your card in its JSON format. Create a new file `src/doSomethingCard.json`:

```json
{
    "type": "AdaptiveCard",
    "body": [
        {
            "type": "TextBlock",
            "size": "Medium",
            "weight": "Bolder",
            "text": "Your doSomething Command is added!"
        },
        {
            "type": "TextBlock",
            "text": "Congratulations! Your app now includes a new DoSomething Command",
            "wrap": true
        }
    ],
    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
    "version": "1.4"
}
```

You can use the [Adaptive Card Designer](https://adaptivecards.io/designer/) to help visually design your Adaptive Card UI.

> Note:

> - Responding with an Adaptive Card is optional. You can also respond with plain text using `MessageFactory.text(message)`;.
> - Learn more about data binding and dynamic data with Adaptive Cards in the [documentation](https://aka.ms/teamsfx-command-response#how-to-build-command-response-using-adaptive-card-with-dynamic-content).

### Step 3: Handle the command

Create a new file, `bot/src/doSomethingCommandHandler.ts`, to handle how the bot responds to the new command and implement the `TeamsFxBotCommandHandler` class.

```typescript
import { Activity, CardFactory, MessageFactory, TurnContext } from "botbuilder";
import { CommandMessage, TeamsFxBotCommandHandler, TriggerPatterns, MessageBuilder, } from "@microsoft/teamsfx";
import doSomethingCard  from "./doSomethingCard.json";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";

export class DoSomethingCommandHandler implements TeamsFxBotCommandHandler {
    triggerPatterns: TriggerPatterns = "doSomething";

    async handleCommandReceived(
        context: TurnContext,
        message: CommandMessage
    ): Promise<string | Partial<Activity>> {
        // verify the command arguments which are received from the client if needed.
        console.log(`Bot received message: ${message.text}`);

        // You can further customize what this command does like call an API, process data, etc.

        const adaptiveCard = AdaptiveCards.declare(doSomethingCard).render();
        return MessageFactory.attachment(CardFactory.adaptiveCard(adaptiveCard));
    }    
}

```

### Step 4: Register the new command

Each new command needs to be configured in the `ConversationBot`, which powers the conversational flow of the command bot template. Navigate to the `bot/src/index.ts` file and update the `commands` array of the `command` property:

```typescript
import * as restify from "restify";
import { ConversationBot } from "@microsoft/teamsfx";
import { HelloWorldCommandHandler } from "./helloWorldCommandHandler";
import { DoSomethingCommandHandler } from "./doSomethingCommandHandler";

const commandBot = new ConversationBot({
    //...
    command: {
        enabled: true,
        commands: [ 
            new HelloWorldCommandHandler(), 
            new DoSomethingCommandHandler() ],
    },
});
```

Congratulations, you've just created your own command! To learn more about the command bot template, [visit the documentation on GitHub](https://aka.ms/teamsfx-command-response) where you can learn more about:

- [Customize the trigger pattern](https://aka.ms/teamsfx-command-response#customize-the-trigger-pattern)
- [Customize the Adaptive Card with dynamic content](https://aka.ms/teamsfx-command-response#how-to-build-command-response-using-adaptive-card-with-dynamic-content)
- [Change the way to initialize the bot](https://aka.ms/teamsfx-command-response#customize-initialization)
- [Connect to an existing API](https://aka.ms/teamsfx-command-response#connect-to-existing-api)
- [Access Microsoft Graph](https://aka.ms/teamsfx-add-sso)

## Extend command bot with other bot scenarios

The Command bot project template is compatible with other bot scenarios like Notification bot and Workflow bot.

### Add notifications to your command bot

The notification feature adds the ability for your application to send Adaptive Cards in response to external events. Follow the [steps here](https://aka.ms/teamsfx-command-response#how-to-extend-my-command-and-response-bot-to-support-notification) to add the notification feature to your command bot. Visit the [the notification bot documentation](https://aka.ms/teamsfx-notification) to learn more.

### Add workflow to your command bot

Adaptive cards can be updated with user interactions to allow progress through a series of steps or sequential workflow. Learn more about adding these features to your command bot in the[documentation](https://aka.ms/teamsfx-card-action-response#add-more-card-actions).

## Additional information and references

- [Manage multiple environments](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-multi-env)
- [Collaborate with others](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-collaboration)
- [Teams Toolkit Documentations](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Teams Toolkit CLI](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-cli)
- [TeamsFx SDK](https://docs.microsoft.com/microsoftteams/platform/toolkit/teamsfx-sdk)
- [Teams Toolkit Samples](https://github.com/OfficeDev/TeamsFx-Samples)
