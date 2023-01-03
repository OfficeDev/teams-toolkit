import { Activity, CardFactory, MessageFactory, TurnContext } from "botbuilder";
import { CommandMessage, TeamsFxBotCommandHandler, TriggerPatterns } from "@microsoft/teamsfx";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import helloWorldCard from "./adaptiveCards/helloworldCommand.json";

/**
 * The `HelloWorldCommandHandler` registers a pattern with the `TeamsFxBotCommandHandler` and responds
 * with an Adaptive Card if the user types the `triggerPatterns`.
 */
export class HelloWorldCommandHandler implements TeamsFxBotCommandHandler {
  triggerPatterns: TriggerPatterns = "helloWorld";

  async handleCommandReceived(
    context: TurnContext,
    message: CommandMessage
  ): Promise<string | Partial<Activity> | void> {
    console.log(`Bot received message: ${message.text}`);

    // An example Adaptive Card that defines the response message of this helloWorld command.
    const cardJson = {
      "type": "AdaptiveCard",
      "body": [
        {
          "type": "TextBlock",
          "size": "Medium",
          "weight": "Bolder",
          "text": "Hello, world!"
        },
        {
          "type": "TextBlock",
          "text": "Congratulations, your bot is running.",
          "wrap": true
        }
      ],
      "actions": [
        {
          "type": "Action.OpenUrl",
          "title": "Learn More",
          "url": "https://aka.ms/teamsfx-docs"
        }
      ],
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "version": "1.4"
    };

    // Parse the card JSON and render it as an HTML element
    const adaptiveCard = AdaptiveCards.declare(cardJson).render();

    return MessageFactory.attachment(CardFactory.adaptiveCard(adaptiveCard));
  }
}
