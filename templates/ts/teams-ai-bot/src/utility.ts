import { CardFactory, TurnContext } from "botbuilder";
import OpenAPIClientAxios from "openapi-client-axios";
const ACData = require("adaptivecards-templating");

export async function getClient(api: OpenAPIClientAxios) {
  const client = await api.getClient();
  client.interceptors.response.use(
    function (response) {
      return response;
    },
    async function (error) {
      throw new Error(`Failed to call API. Error: ${error.message}`);
    }
  );
  return client;
}

export function generateAdaptiveCard(templatePath: string, result: any) {
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
