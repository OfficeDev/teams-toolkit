const helloWorldCard = require("./adaptiveCards/helloworldCommand.json");
const { MessageBuilder } = require("@microsoft/teamsfx");

class HelloWorldCommandHandler {
  commandNameOrPattern = "helloWorld";

  async handleCommandReceived(context, receivedText) {
    // verify the command arguments which are received from the client if needed.

    // do something to process your command and return an adaptive card or a text message.
    return MessageBuilder.attachAdaptiveCardWithoutData(helloWorldCard);
  }
}

module.exports = {
  HelloWorldCommandHandler,
};
