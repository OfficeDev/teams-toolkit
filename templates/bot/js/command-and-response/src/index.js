// Create HTTP server.
const restify = require("restify");
const { commandBot } = require("./internal/initialize");

// Create HTTP server.
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot Started, ${server.name} listening to ${server.url}`);
});

// Process Teams activity with Bot Framework.
server.post("/api/messages", async (req, res) => {
  await commandBot.requestHandler(req, res);
});
