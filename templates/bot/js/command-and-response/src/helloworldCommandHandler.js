const helloWorldCard = require("./adaptiveCards/helloworldCommand.json");
const { MessageBuilder } = require("@microsoft/teamsfx");

class HelloWorldCommandHandler {
  triggerPatterns = "helloWorld";

  async handleCommandReceived(context, message) {
    // verify the command arguments which are received from the client if needed.
    console.log(`Bot received message: ${message.text}`);

    // do something to process your command and return message activity as the response.
    return MessageBuilder.attachAdaptiveCardWithoutData(helloWorldCard);
  }
}

module.exports = {
  HelloWorldCommandHandler,
};
