const ACData = require("adaptivecards-templating");
const { InvokeResponseFactory } = require("@microsoft/teamsfx");
const responseCard = require("../adaptiveCards/doStuffActionResponse.json");

class DoStuffActionHandler {
  /**
   * A global unique string associated with the `Action.Execute` action.
   * The value should be the same as the `verb` property which you define in your adaptive card JSON.
   */
  triggerVerb = "doStuff";

  async handleActionInvoked(context, message) {
    /**
     * You can send an adaptive card to respond to the card action invoke.
     */
    const cardData = {
      title: "Hello World Bot",
      body: "Congratulations! Your task is processed successfully.",
    };
    const cardJson = new ACData.Template(responseCard).expand({ $root: cardData });
    return InvokeResponseFactory.adaptiveCard(cardJson);

    /**
     * If you want to send invoke response with text message, you can:
     * 
     return InvokeResponseFactory.textMessage("[ACK] Successfully!");
     */

    /**
     * If you want to send invoke response with error message, you can:
     *
     * return InvokeResponseFactory.errorResponse(InvokeResponseErrorCode.BadRequest, "The incoming request is invalid.");
     */
  }
}

module.exports = {
  DoStuffActionHandler,
};
