import { AzureFunction, Context } from "@azure/functions";
import { ConversationBot } from "@microsoft/teamsfx";
import { buildAdaptiveCard } from "./adaptiveCard";
import notificationTemplate from "./adaptiveCards/notification-default.json";

// Time trigger to send notification. You can change the schedule in ../timerNotifyTrigger/function.json
const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
  const timeStamp = new Date().toISOString();
  for (const target of await ConversationBot.installations()) {
    await target.sendAdaptiveCard(
      buildAdaptiveCard(
        {
          title: "New Event Occurred!",
          appName: "Contoso App Notification",
          description: `This is a sample time-triggered notification (${timeStamp}).`,
          notificationUrl: "https://www.adaptivecards.io/",
        },
        notificationTemplate
      )
    );
  }

  /****** To distinguish different target types ******/
  /** "Channel" means this bot is installed to a Team (default to notify General channel)
  if (target.type === "Channel") {
    // Directly notify the Team (to the default General channel)
    await target.sendAdaptiveCard(...);

    // List all channels in the Team then notify each channel
    const channels = await target.channels();
    for (const channel of channels) {
      await channel.sendAdaptiveCard(...);
    }

    // List all members in the Team then notify individual person
    const members = await target.members();
    for (const member of members) {
      await member.sendAdaptiveCard(...);
    }
  }
  **/

  /** "Group" means this bot is installe to a Group Chat
  if (target.type === "Group") {
    // Directly notify the Group Chat
    await target.sendAdaptiveCard(...);

    // List all members in the Group Chat then notify individual person
    const members = await target.members();
    for (const member of members) {
      await member.sendAdaptiveCard(...);
    }
  }
  **/

  /** "Person" means this bot is installed as Personal app
  if (target.type === "Person") {
    // Directly notify the individual person
    await target.sendAdaptiveCard(...);
  }
  **/
};

export default timerTrigger;
