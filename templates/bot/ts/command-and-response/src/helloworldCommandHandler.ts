import { Activity, TurnContext } from "botbuilder";
import { TeamsFxBotCommandHandler } from "./sdk/interface";
import helloWorldCard from "./adaptiveCards/helloworldCommand.json";
import { MessageBuilder } from "./sdk/messageBuilder";

export class HelloWorldCommandHandler implements TeamsFxBotCommandHandler {
  commandNameOrPattern: string | RegExp = "helloWorld"; // command?

  async handleCommandReceived(
    context: TurnContext,
    receivedText: string
  ): Promise<string | Partial<Activity>> {
    // verify the command arguments which are received from the client if needed.

    // do something to process your command and return an adaptive card or a text message.
    return MessageBuilder.attachAdaptiveCardWithoutData(helloWorldCard);
  }
}
