import { Activity, CardFactory, MessageFactory, TurnContext } from "botbuilder";
import { CommandMessage, TeamsFxBotCommandHandler, TriggerPatterns } from "@microsoft/teamsfx";
import * as ACData from "adaptivecards-templating";
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
    console.log(`App received message: ${message.text}`);

    const cardJson = new ACData.Template(helloWorldCard).expand({
      $root: {
        title: "Your Hello World App is Running",
        body: "Congratulations! Your Hello World App is running. Open the documentation below to learn more about how to build applications with the Teams Toolkit.",
      },
    });
    return MessageFactory.attachment(CardFactory.adaptiveCard(cardJson));
  }
}
