# Overview of the Workflow bot template

This template showcases an app that responds to chat commands by displaying UI using an Adaptive Card. The card has a button that demonstrates how to receive user input on the card, do something like call an API, and update the UI of that card. This can be further customized to create richer, more complex sequence of steps which forms a complete workflow.

The app template is built using the TeamsFx SDK, which provides a simple set of functions over the Microsoft Bot Framework to implement this scenario.

## Get started with the Workflow bot

1. First, select the Teams Toolkit icon on the left in the VS Code toolbar.
2. In the Account section, sign in with your [M365 account](https://docs.microsoft.com/microsoftteams/platform/toolkit/accounts) if you haven't already.
3. Press F5 to start debugging which launches your app in Teams using a web browser.
4. When Teams launches in the browser, select the Add button in the dialog to install your app to Teams.
5. Type or select `helloWorld` in the chat to send it to your bot - this is the default command provided by the template.
6. In the response from the bot, select the **Do Stuff** button.

The bot will respond by updating the existing Adaptive Card to show the workflow is now complete! Continue reading to learn more about what's included in the template and how to customize it.

## What's included in the template

| Folder | Contents |
| - | - |
| `.fx` | Project level settings, configurations, and environment information |
| `.vscode` | VS Code files for local debug |
| `bot` | The source code for the Workflow bot app |
| `templates` | Templates for the Teams application manifest and for provisioning Azure resources (optional) used by Teams Toolkit |

The following files can be customized and demonstrate an example implementation to get you started.

| File | Contents |
| - | - |
| `src/index.ts` | Application entry point and `restify` handlers for the Workflow bot |
| `src/commands/helloworldCommandHandler.ts` | Implementation that handles responding to a chat command |
| `src/adaptiveCards/helloworldCommandResponse.json` | Defines the Adaptive Card (UI) that is displayed in response to a chat command |
| `src/cardActions/doStuffActionHandler.ts` | Implements the handler for the `doStuff` button displayed in the Adaptive Card |
| `src/cardModels.ts` | An example of how to use a typed data model to bind with an Adaptive Card |
| `src/internal/initialize.ts` | Application initialization and bot message handling |

## Extending the workflow bot template

1. [Step 1: Add an action to your Adaptive Card](#step-1-add-an-action-to-your-adaptive-card)
2. [Step 2: Respond with a new Adaptive Card](#step-2-respond-with-a-new-adaptive-card)
3. [Step 3: Handle the new action](#step-3-handle-the-new-action)
4. [Step 4: Register the new handler](#step-4-register-the-new-handler)

### Step 1: Add an action to your Adaptive Card

Adding new actions (buttons) to an Adaptive Card is as simple as defining them in the JSON file. Add a new `DoSomething` action to the `src/adaptiveCards/helloworldCommandResponse.json` file:

```json
{ 
  "type": "AdaptiveCard", 
  "body": [
    ...
    {
      "type": "ActionSet",
      "actions": [
        ...
        {
          "type": "Action.Execute",
          "title": "DoSomething",
          "verb": "doSomething" 
        }
      ]
    }
  ]
  ... 
} 
```

Specifying the `type` as `Action.Execute` allows this Adaptive Card to respond with another card, which will update the UI by replacing the existing card. Learn more about [Adaptive Card Universal Actions in the documentation](https://learn.microsoft.com/microsoftteams/platform/task-modules-and-cards/cards/universal-actions-for-adaptive-cards/overview?tabs=mobile#universal-actions).  

### Step 2: Respond with a new Adaptive Card

For each action, you can display a new Adaptive Card as a response to the user. Create a new file, `bot/src/adaptiveCards/doSomethingResponse.json` to use as a response for the `DoSomething` action created in the previous step:

```json
{
  "type": "AdaptiveCard",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "A sample response to DoSomething!"
    }
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4"
}
```

You can use the [Adaptive Card Designer](https://adaptivecards.io/designer/) to help visually design your Adaptive Card UI.

### Step 3: Handle the new action

The TeamsFx SDK provides a convenient class, `TeamsFxAdaptiveCardActionHandler`, to handle when an action from an Adaptive Card is invoked. Create a new file, `bot/src/cardActions/doSomethingActionHandler.ts`:

```typescript
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import { TurnContext, InvokeResponse } from "botbuilder";
import { TeamsFxAdaptiveCardActionHandler, InvokeResponseFactory } from "@microsoft/teamsfx";
import responseCard from "../adaptiveCards/doSomethingResponse.json";

export class DoSomethingActionHandler implements TeamsFxAdaptiveCardActionHandler { 
    triggerVerb = "doSomething";

    async handleActionInvoked(context: TurnContext, actionData: any): Promise<InvokeResponse> { 
        const responseCardJson = AdaptiveCards.declare(responseCard).render(actionData);
        return InvokeResponseFactory.adaptiveCard(responseCardJson);
    } 
} 
```

* The `triggerVerb` is the `verb` property of your action defined in the JSON from the previous step.
* The `actionData` is the data associated with the action, which may include dynamic user input or some contextual data provided in the `data` property of your action.

You can customize what the action does here, including calling an API, processing some data, etc.

### Step 4: Register the new handler

Each new card action needs to be configured in the `ConversationBot`, which powers the conversational flow of the workflow bot template. Navigate to the `bot/src/internal/initialize.ts` file and update the `actions` array of the `cardAction` property:

```typescript
export const conversationBot = new ConversationBot({ 
  ... 
  cardAction: { 
    enabled: true, 
    actions: [ 
      new DoStuffCardActionHandler(),
      new DoSomethingActionHandler()
    ], 
  } 
}); 
```

## Next steps

Congratulations, you've just created your own workflow! To learn more about extending the Workflow bot template, [visit the documentation on GitHub](https://aka.ms/teamsfx-card-action-response).