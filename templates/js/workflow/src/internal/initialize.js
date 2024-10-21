const { BotBuilderCloudAdapter } = require("@microsoft/teamsfx");
const ConversationBot = BotBuilderCloudAdapter.ConversationBot;
const { DoStuffActionHandler } = require("../cardActions/doStuffActionHandler");
const { HelloWorldCommandHandler } = require("../commands/helloworldCommandHandler");
const { GenericCommandHandler } = require("../commands/genericCommandHandler");
const config = require("./config");

// Create the conversation bot and register the command and card action handlers for your app.
const workflowApp = new ConversationBot({
  // The bot id and password to create CloudAdapter.
  // See https://aka.ms/about-bot-adapter to learn more about adapters.
  adapterConfig: config,
  command: {
    enabled: true,
    commands: [new HelloWorldCommandHandler(), new GenericCommandHandler()],
  },
  cardAction: {
    enabled: true,
    actions: [new DoStuffActionHandler()],
  },
});

module.exports = {
  workflowApp,
};
