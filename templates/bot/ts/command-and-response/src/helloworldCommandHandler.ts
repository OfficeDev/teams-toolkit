import { Activity, TurnContext } from "botbuilder";
import { CommandMessage, TeamsFxBotCommandHandler, TriggerPatterns } from "@microsoft/teamsfx";
import helloWorldCard from "./adaptiveCards/helloworldCommand.json";
import { MessageBuilder } from "@microsoft/teamsfx";

export class HelloWorldCommandHandler implements TeamsFxBotCommandHandler {
  triggerPatterns: TriggerPatterns = "helloWorld";

  async handleCommandReceived(
    context: TurnContext,
    message: CommandMessage
  ): Promise<string | Partial<Activity>> {
    // verify the command arguments which are received from the client if needed.
    console.log(`Bot received message: ${message.text}`);

    // do something to process your command and return message activity as the response.
    return MessageBuilder.attachAdaptiveCardWithoutData(helloWorldCard);
  }
}
