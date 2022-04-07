// Create HTTP server.
import { TeamsActivityHandler } from "botbuilder";
import * as restify from "restify";
import { adapter } from "./internal/initialize";

// Create HTTP server.
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot Started, ${server.name} listening to ${server.url}`);
});

// Process Teams activity with Bot Framework.
const handler = new TeamsActivityHandler();
server.post("/api/messages", async (req, res) => {
  await adapter.processActivity(req, res, async (context) => {
    await handler.run(context);
  });
});
