import * as ACData from "adaptivecards-templating";
import * as restify from "restify";
import notificationTemplate from "./adaptiveCards/notification-default.json";
import { notificationApp } from "./internal/initialize";
import { CardData } from "./cardModels";
import { TeamsBot } from "./teamsBot";

// Create HTTP server.
const server = restify.createServer();
server.use(restify.plugins.bodyParser());
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nApp Started, ${server.name} listening to ${server.url}`);
});

// Register an API endpoint with `restify`.
//
// This endpoint is provided by your application to listen to events. You can configure
// your IT processes, other applications, background tasks, etc - to POST events to this
// endpoint.
//
// In response to events, this function sends Adaptive Cards to Teams. You can update the logic in this function
// to suit your needs. You can enrich the event with additional data and send an Adaptive Card as required.
//
// You can add authentication / authorization for this API. Refer to
// https://aka.ms/teamsfx-notification for more details.
server.post(
  "/api/notification",
  restify.plugins.queryParser(),
  restify.plugins.bodyParser(), // Add more parsers if needed
  async (req, res) => {
    // By default this function will iterate all the installation points and send an Adaptive Card
    // to every installation.
    const pageSize = 100;
    let continuationToken: string | undefined = undefined;
    do {
      const pagedData = await notificationApp.notification.getPagedInstallations(
        pageSize,
        continuationToken
      );
      const installations = pagedData.data;
      continuationToken = pagedData.continuationToken;

      for (const target of installations) {
        await target.sendAdaptiveCard(
          new ACData.Template(notificationTemplate).expand({
            $root: {
              title: "New Event Occurred!",
              appName: "Contoso App Notification",
              description: `This is a sample http-triggered notification to ${target.type}`,
              notificationUrl: "https://aka.ms/teamsfx-notification-new",
            },
          })
        );

        // Note - you can filter the installations if you don't want to send the event to every installation.

        /** For example, if the current target is a "Group" this means that the notification application is
         *  installed in a Group Chat.
        if (target.type === NotificationTargetType.Group) {
          // You can send the Adaptive Card to the Group Chat
          await target.sendAdaptiveCard(...);
  
          // Or you can list all members in the Group Chat and send the Adaptive Card to each Team member
          const pageSize = 100;
          let continuationToken: string | undefined = undefined;
          do {
            const pagedData = await target.getPagedMembers(pageSize, continuationToken);
            const members = pagedData.data;
            continuationToken = pagedData.continuationToken;

            for (const member of members) {
              // You can even filter the members and only send the Adaptive Card to members that fit a criteria
              await member.sendAdaptiveCard(...);
            }
          } while (continuationToken);
        }
        **/

        /** If the current target is "Channel" this means that the notification application is installed
         *  in a Team.
        if (target.type === NotificationTargetType.Channel) {
          // If you send an Adaptive Card to the Team (the target), it sends it to the `General` channel of the Team
          await target.sendAdaptiveCard(...);
  
          // Alternatively, you can list all channels in the Team and send the Adaptive Card to each channel
          const channels = await target.channels();
          for (const channel of channels) {
            await channel.sendAdaptiveCard(...);
          }
  
          // Or, you can list all members in the Team and send the Adaptive Card to each Team member
          const pageSize = 100;
          let continuationToken: string | undefined = undefined;
          do {
            const pagedData = await target.getPagedMembers(pageSize, continuationToken);
            const members = pagedData.data;
            continuationToken = pagedData.continuationToken;

            for (const member of members) {
              // You can even filter the members and only send the Adaptive Card to members that fit a criteria
              await member.sendAdaptiveCard(...);
            }
          } while (continuationToken);
        }
        **/

        /** If the current target is "Person" this means that the notification application is installed in a
         *  personal chat.
        if (target.type === NotificationTargetType.Person) {
          // Directly notify the individual person
          await target.sendAdaptiveCard(...);
        }
        **/
      }
    } while (continuationToken);

    /** You can also find someone and notify the individual person
    const member = await notificationApp.notification.findMember(
      async (m) => m.account.email === "someone@contoso.com"
    );
    await member?.sendAdaptiveCard(...);
    **/

    /** Or find multiple people and notify them
    const members = await notificationApp.notification.findAllMembers(
      async (m) => m.account.email?.startsWith("test")
    );
    for (const member of members) {
      await member.sendAdaptiveCard(...);
    }
    **/

    res.json({});
  }
);

// Register an API endpoint with `restify`. Teams sends messages to your application
// through this endpoint.
//
// The Teams Toolkit bot registration configures the bot with `/api/messages` as the
// Bot Framework endpoint. If you customize this route, update the Bot registration
// in `/templates/provision/bot.bicep`.
const teamsBot = new TeamsBot();
server.post("/api/messages", async (req, res) => {
  await notificationApp.requestHandler(req, res, async (context) => {
    await teamsBot.run(context);
  });
});
