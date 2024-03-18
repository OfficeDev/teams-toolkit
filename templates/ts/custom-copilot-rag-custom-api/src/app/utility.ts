import { CardFactory } from "botbuilder";
const ACData = require("adaptivecards-templating");
import { OpenAPIClient } from "openapi-client-axios";
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

export function addAuthConfig(client: OpenAPIClient) {
  // This part is sample code for adding authentication to the client.
  // Please replace it with your own authentication logic.
  // Please refer to https://openapistack.co/docs/openapi-client-axios/intro/ for more info about the client.
  /*
  client.interceptors.request.use((config) => {
    // You can specify different authentication methods for different urls and methods.
    if (config.url == "your-url" && config.method == "your-method") {
      // You can update the target url
      config.url = "your-new-url";

      // For Basic Authentication
      config.headers["Authorization"] = `Basic ${btoa("Your-Username:Your-Password")}`;

      // For Cookie
      config.headers["Cookie"] = `Your-Cookie`;

      // For Bearer Token
      config.headers["Authorization"] = `Bearer "Your-Token"`;
    }
    return config;
  });
  */
}
