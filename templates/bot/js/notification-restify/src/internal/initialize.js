const { ConversationBot } = require("@microsoft/teamsfx");
const restify = require("restify");

// Create bot.
const bot = new ConversationBot({
  // The bot id and password to create BotFrameworkAdapter.
  // See https://aka.ms/about-bot-adapter to learn more about adapters.
  adapterConfig: {
    appId: process.env.BOT_ID,
    appPassword: process.env.BOT_PASSWORD,
  },
  // Enable notification
  notification: {
    enabled: true,
  },
});

// Create HTTP server.
const server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot Started, ${server.name} listening to ${server.url}`);
});

module.exports = {
  bot,
  server,
};
