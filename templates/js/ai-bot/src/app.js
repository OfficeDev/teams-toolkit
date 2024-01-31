const { MemoryStorage } = require("botbuilder");
const path = require("path");
const config = require("./config");

// See https://aka.ms/teams-ai-library to learn more about the Teams AI library.
const { Application, ActionPlanner, OpenAIModel, PromptManager } = require("@microsoft/teams-ai");

// Create AI components
const model = new OpenAIModel({
  // Use OpenAI
  apiKey: config.openAIKey,
  defaultModel: "gpt-3.5-turbo",

  // Uncomment the following lines to use Azure OpenAI
  // azureApiKey: config.azureOpenAIKey,
  // azureDefaultDeployment: "gpt-35-turbo",
  // azureEndpoint: config.azureOpenAIEndpoint,

  useSystemMessages: true,
  logRequests: true,
});
const prompts = new PromptManager({
  promptsFolder: path.join(__dirname, "../src/prompts"),
});
const planner = new ActionPlanner({
  model,
  prompts,
  defaultPrompt: "chat",
});

// Define storage and application
const storage = new MemoryStorage();
const app = new Application({
  storage,
  ai: {
    planner,
  },
});

module.exports = app;
