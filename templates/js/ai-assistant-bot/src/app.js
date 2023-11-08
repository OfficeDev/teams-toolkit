const { MemoryStorage } = require("botbuilder");
const config = require("./config");

// See https://aka.ms/teams-ai-library to learn more about the Teams AI library.
const { Application, AssistantsPlanner, AI } = require("@microsoft/teams-ai");

// See README.md to prepare your own OpenAI Assistant
if (!config.openAIKey || !config.openAIAssistantId) {
  throw new Error(
    "Missing OPENAI_API_KEY or OPENAI_ASSISTANT_ID. See README.md to prepare your own OpenAI Assistant."
  );
}

// Create AI components
// Use OpenAI
const planner = new AssistantsPlanner({
  apiKey: config.openAIKey,
  assistant_id: config.openAIAssistantId,
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

app.message("/reset", async (context, state) => {
  state.deleteConversationState();
  await context.sendActivity("Ok lets start this over.");
});

app.ai.action(AI.HttpErrorActionName, async (context, state, data) => {
  await context.sendActivity("An AI request failed. Please try again later.");
  return AI.StopCommandName;
});

module.exports = app;
