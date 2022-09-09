import { DoStuffCardActionHandler } from "../cardActions/doStuffActionHandler";
import { HelloWorldCommandHandler } from "../commands/helloworldCommandHandler";
import { ConversationBot } from "@microsoft/teamsfx";

// Create the conversation bot and register the command and card action handlers for your app.
export const conversationBot = new ConversationBot({
  // The bot id and password to create BotFrameworkAdapter.
  // See https://aka.ms/about-bot-adapter to learn more about adapters.
  adapterConfig: {
    appId: process.env.BOT_ID,
    appPassword: process.env.BOT_PASSWORD,
  },
  command: {
    enabled: true,
    commands: [new HelloWorldCommandHandler()],
  },
  cardAction: {
    enabled: true,
    actions: [new DoStuffCardActionHandler()],
  },
});
