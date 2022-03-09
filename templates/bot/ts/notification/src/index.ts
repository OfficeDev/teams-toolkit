import { Activity, CardFactory } from "botbuilder";
import { AdaptiveCards } from "@microsoft/adaptivecards-tools";
import * as cron from "node-cron";
import { TeamsFxBot } from "./sdk/bot";
import { adapter } from "./adapter";
import { server } from "./server";
import messageTemplate from "./message.template.json";

const teamsfxBot = new TeamsFxBot(adapter);

const message: Partial<Activity> = {
  attachments: [
    CardFactory.adaptiveCard(AdaptiveCards.declare(messageTemplate).render({
      title: "Notification Test",
      message: "This is a notification from TeamsFx bot."
    }))
  ]
};

// HTTP trigger to send notification.
server.post("/api/notify/default", async (req, res) => {
  await teamsfxBot.forEachSubscribers(async subscriber => {
    await teamsfxBot.notifySubscriber(subscriber, message);
  });

  res.json({});
});

// Time trigger to send notification.
cron.schedule('*/1 * * * *', async () => {
  // send notification every one minutes.
  await teamsfxBot.forEachSubscribers(async subscriber => {
    await teamsfxBot.notifySubscriber(subscriber, message);
  });
});