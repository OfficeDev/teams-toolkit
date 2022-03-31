const { AdaptiveCards } = require("@microsoft/adaptivecards-tools");

/**
 * Build adaptive card payload with card template and data.
 * @param cardData The adaptive card data.
 * @param cardTemplate The adaptive card template.
 * @returns An adaptive card object.
 */
function buildAdaptiveCard(cardData, cardTemplate) {
  return AdaptiveCards.declare(cardTemplate).render(cardData);
}

module.exports = {
  buildAdaptiveCard,
};
