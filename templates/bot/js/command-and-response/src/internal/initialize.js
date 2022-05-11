const { ConversationBot } = require("@microsoft/teamsfx");
const { HelloWorldCommandHandler } = require("../helloworldCommandHandler");

// Create the command bot and register the command handlers for your app.
// You can also use the commandBot.command.registerCommands to register other commands
// if you don't want to register all of them in the constructor
const commandBot = new ConversationBot({
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
});

module.exports = {
  commandBot,
};
