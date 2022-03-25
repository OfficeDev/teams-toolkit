import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { ConversationBot } from "@microsoft/teamsfx";
import { buildAdaptiveCard } from "./adaptiveCard";
import notificationTemplate from "./adaptiveCards/notification-default.json";

// HTTP trigger to send notification.
const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  for (const target of await ConversationBot.installations()) {
    await target.sendAdaptiveCard(
      buildAdaptiveCard(() => {
        return {
          title: "New Event Occurred!",
          appName: "Contoso App Notification",
          description: `This is a sample http-triggered notification to ${target.type}`,
          notificationUrl: "https://www.adaptivecards.io/",
        };
      }, notificationTemplate)
    );
  }

  context.res = {};
};

export default httpTrigger;
