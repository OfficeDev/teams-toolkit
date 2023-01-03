import * as restify from "restify";
import { ConversationBot } from "@microsoft/teamsfx";
import { HelloWorldCommandHandler } from "./helloWorldCommandHandler";

// The TeamsFx ConservationBot provides a simple way to configure how commands are handled.
export const commandBot = new ConversationBot({
  // Configuration for the underlying BotFrameworkAdapter.
  // By default, BOT_ID and BOT_PASSWORD are set by Teams Toolkit automatically when debugging locally or provisioning.
  adapterConfig: {
    appId: process.env.BOT_ID,
    appPassword: process.env.BOT_PASSWORD,
  },
  command: {
    enabled: true,
    // Implement and add additional command handlers here as your bots' capabilities grow.
    commands: [new HelloWorldCommandHandler()],
  },
});

// This template uses restify to serve HTTP responses.
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot Started, ${server.name} listening to ${server.url}`);
});

// Register an API endpoint with `restify`. Teams sends messages to your application
// through this endpoint.
//
// The Teams Toolkit bot registration configures the bot with `/api/messages` as the
// Bot Framework endpoint. If you customize this route, update the Bot registration
// in `templates/azure/provision/botservice.bicep`.
server.post("/api/messages", async (req, res) => {
  await commandBot.requestHandler(req, res);
});
