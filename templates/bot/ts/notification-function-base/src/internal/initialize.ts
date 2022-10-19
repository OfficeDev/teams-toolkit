import { ConversationBot } from "@microsoft/teamsfx";
import config from "./config";

// Create bot.
export const bot = new ConversationBot({
  // The bot id and password to create BotFrameworkAdapter.
  // See https://aka.ms/about-bot-adapter to learn more about adapters.
  adapterConfig: {
    appId: config.botId,
    appPassword: config.botPassword,
  },
  // Enable notification
  notification: {
    enabled: true,
  },
});
