import { HelloWorldCommandHandler } from "../helloworldCommandHandler";
import { ConversationBot } from "@microsoft/teamsfx";
import config from "./config";

// Create the command bot and register the command handlers for your app.
// You can also use the commandApp.command.registerCommands to register other commands
// if you don't want to register all of them in the constructor
export const commandApp = new ConversationBot({
  // The bot id and password to create BotFrameworkAdapter.
  // See https://aka.ms/about-bot-adapter to learn more about adapters.
  adapterConfig: {
    appId: config.botId,
    appPassword: config.botPassword,
  },
  command: {
    enabled: true,
    commands: [new HelloWorldCommandHandler()],
  },
});
