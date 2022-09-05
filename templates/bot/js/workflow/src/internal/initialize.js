const { ConversationBot } = require("@microsoft/teamsfx");
const { DoStuffActionHandler } = require("../cardActions/doStuffActionHandler");
const { HelloWorldCommandHandler } = require("../commands/helloworldCommandHandler");

// Create the conversation bot and register the command and card action handlers for your app.
const conversationBot = new ConversationBot({
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
    actions: [new DoStuffActionHandler()],
  },
});

module.exports = {
  conversationBot,
};
