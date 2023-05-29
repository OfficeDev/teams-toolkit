const helloWorldCard = require("./adaptiveCards/helloworldCommand.json");
const { AdaptiveCards } = require("@microsoft/adaptivecards-tools");
const { CardFactory, MessageFactory } = require("botbuilder");

class HelloWorldCommandHandler {
  triggerPatterns = "helloWorld";

  async handleCommandReceived(context, message) {
    // verify the command arguments which are received from the client if needed.
    console.log(`App received message: ${message.text}`);

    // do something to process your command and return message activity as the response

    // render your adaptive card for reply message
    const cardData = {
      title: "Your Hello World App is Running",
      body: "Congratulations! Your Hello World App is running. Open the documentation below to learn more about how to build applications with the Teams Toolkit.",
    };

    const cardJson = AdaptiveCards.declare(helloWorldCard).render(cardData);
    return MessageFactory.attachment(CardFactory.adaptiveCard(cardJson));
  }
}

module.exports = {
  HelloWorldCommandHandler,
};
