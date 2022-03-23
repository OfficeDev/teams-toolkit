import { AzureFunction, Context } from "@azure/functions";
import { BotNotification } from "@microsoft/teamsfx";
import { buildAdaptiveCard } from "./adaptiveCard";
import notificationTemplate from "./adaptiveCards/notification-default.json";

// Time trigger to send notification. You can change the schedule in ../timerNotifyTrigger/function.json
const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
  const timeStamp = new Date().toISOString();
  for (const target of await BotNotification.installations()) {
    await target.sendAdaptiveCard(
      buildAdaptiveCard(() => {
        return {
          title: "New Event Occurred!",
          appName: "Contoso App Notification",
          description: `This is a sample time-triggered notification (${timeStamp}).`,
          notificationUrl: "https://www.adaptivecards.io/",
        };
      }, notificationTemplate)
    );
  }
};

export default timerTrigger;
