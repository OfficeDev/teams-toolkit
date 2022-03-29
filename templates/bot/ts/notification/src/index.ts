import { ConversationBot } from "@microsoft/teamsfx";
import { TeamsActivityHandler } from "botbuilder";
import { buildAdaptiveCard } from "./adaptiveCard";
import notificationTemplate from "./adaptiveCards/notification-default.json";
import { adapter } from "./internal/initialize";
import { server } from "./internal/server";

// HTTP trigger to send notification.
server.post("/api/notification", async (req, res) => {
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

  res.json({});
});

// Process Teams activity with Bot Framework.
const handler = new TeamsActivityHandler();
server.post("/api/messages", async (req, res) => {
  await adapter.processActivity(req, res, async (context) => {
    await handler.run(context);
  });
});
