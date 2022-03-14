import { AzureFunction, Context } from "@azure/functions";
import { appNotification } from "./internal/initialize";
import { buildBotMessage } from "./adaptiveCardBuider";

// Time trigger to send notification. You can change the schedule in ../timerNotifyTrigger/function.json
const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
  const timeStamp = new Date().toISOString();
  await appNotification.notifyAll(
    buildBotMessage(() => {
      return {
        title: "New Event Occurred!",
        appName: "Contoso App Notification",
        description: `This is a sample time-triggered notification (${timeStamp}).`,
        notificationUrl: "https://www.adaptivecards.io/",
      };
    })
  );
};

export default timerTrigger;
