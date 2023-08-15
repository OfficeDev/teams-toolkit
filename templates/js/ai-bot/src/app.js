const { MemoryStorage } = require("botbuilder");
const path = require("path");
const config = require("./config");

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
// Uncomment the following lines to use Azure OpenAI
/**
const planner = new AzureOpenAIPlanner({
  apiKey: config.azureOpenAIKey,
  endpoint: config.azureOpenAIEndpoint,
  defaultModel: "gpt-35-turbo",
  useSystemMessage: true,
  logRequests: true
});
*/
const promptManager = new DefaultPromptManager(path.join(__dirname, "../src/prompts"));

// Define storage and application
const storage = new MemoryStorage();
const app = new Application({
  storage,
  ai: {
    planner,
    promptManager,
    prompt: "chat",
    history: {
      assistantHistoryType: "text",
    },
  },
});

app.conversationUpdate("membersAdded", async (context) => {
  await context.sendActivity("How can I help you today?");
});

module.exports = app;
