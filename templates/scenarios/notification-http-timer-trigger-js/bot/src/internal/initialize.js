const { ConversationBot } = require("@microsoft/teamsfx");
const config = require("./config");

// Create bot.
const bot = new ConversationBot({
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

module.exports = {
  bot,
};
