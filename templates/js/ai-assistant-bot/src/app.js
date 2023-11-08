const { MemoryStorage } = require("botbuilder");
const path = require("path");
const config = require("./config");

// See https://aka.ms/teams-ai-library to learn more about the Teams AI library.
const {
  Application,
  DefaultPromptManager,
  OpenAIPlanner,
  AzureOpenAIPlanner,
} = require("@microsoft/teams-ai");

// Create AI components
// Use OpenAI
const planner = new OpenAIPlanner({
  apiKey: config.openAIKey,
  defaultModel: "gpt-3.5-turbo",
  useSystemMessage: true,
  logRequests: true,
});

// Define storage and application
const storage = new MemoryStorage();
const app = new Application({
  storage,
  ai: {
    planner,
  },
});

app.conversationUpdate("membersAdded", async (context) => {
  await context.sendActivity("I'm an assistant bot. How can I help you today?");
});

module.exports = app;
