const helloWorldCard = require("../adaptiveCards/helloworldCommandResponse.json");
const { MessageBuilder } = require("@microsoft/teamsfx");

class HelloWorldCommandHandler {
  triggerPatterns = "helloWorld";

  async handleCommandReceived(context, message) {
    console.log(`Bot received message: ${message.text}`);

    // render your adaptive card for reply message
    const cardData = {
      title: "Your Hello World Bot is Running",
      body: "Congratulations! Your hello world bot is running. Click the documentation below to learn more about Bots and the Teams Toolkit.",
    };

    return MessageBuilder.attachAdaptiveCard(helloWorldCard, cardData);
  }
}

module.exports = {
  HelloWorldCommandHandler,
};
