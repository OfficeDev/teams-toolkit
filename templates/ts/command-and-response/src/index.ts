import express from "express";
import { commandApp } from "./internal/initialize";
import { TeamsBot } from "./teamsBot";

// This template uses `express` to serve HTTP responses.
// Create express application.
const expressApp = express();
expressApp.use(express.json());

const server = expressApp.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot Started, ${expressApp.name} listening to`, server.address());
});

// Register an API endpoint with `express`. Teams sends messages to your application
// through this endpoint.
//
// The Teams Toolkit bot registration configures the bot with `/api/messages` as the
// Bot Framework endpoint. If you customize this route, update the Bot registration
// in `templates/azure/provision/botservice.bicep`.
const teamsBot = new TeamsBot();
expressApp.post("/api/messages", async (req, res) => {
  await commandApp.requestHandler(req, res, async (context) => {
    await teamsBot.run(context);
  });
});
