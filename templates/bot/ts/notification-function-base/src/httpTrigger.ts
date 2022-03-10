import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { appNotification } from "./internal/initialize";
import { buildBotMessage } from "./adaptiveCardBuider";

// HTTP trigger to send notification.
const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  await appNotification.notifyAll(
    buildBotMessage(() => {
      return {
        title: "New Event Occurred!",
        appName: "Contoso App Notification",
        description: "This is a sample http-triggered notification",
        notificationUrl: "https://www.adaptivecards.io/",
      };
    })
  );

  context.res = {};
};

export default httpTrigger;
