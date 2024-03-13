const { CardFactory } = require("botbuilder");
const ACData = require("adaptivecards-templating");
function generateAdaptiveCard(templatePath, result) {
  if (!result || !result.data) {
    throw new Error("Get empty result from api call.");
  }
  const adaptiveCardTemplate = require(templatePath);
  const template = new ACData.Template(adaptiveCardTemplate);
  const cardContent = template.expand({
    $root: result.data,
  });
  const card = CardFactory.adaptiveCard(cardContent);
  return card;
}
module.exports = generateAdaptiveCard;
