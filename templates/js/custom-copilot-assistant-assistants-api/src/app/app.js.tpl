const { MemoryStorage, MessageFactory } = require("botbuilder");
const config = require("../config");

// See https://aka.ms/teams-ai-library to learn more about the Teams AI library.
const { Application, AI, preview } = require("@microsoft/teams-ai");

{{#useOpenAI}}
// See README.md to prepare your own OpenAI Assistant
if (!config.openAIKey || !config.openAIAssistantId) {
  throw new Error(
    "Missing OPENAI_API_KEY or OPENAI_ASSISTANT_ID. See README.md to prepare your own OpenAI Assistant."
  );
}
{{/useOpenAI}}
 {{#useAzureOpenAI}}
// See README.md to prepare your own Azure OpenAI Assistant
if (!config.azureOpenAIKey || !config.azureOpenAIAssistantId) {
  throw new Error(
    "Missing AZURE_OPENAI_API_KEY or AZURE_OPENAI_ASSISTANT_ID. See README.md to prepare your own Azure OpenAI Assistant."
  );
}
{{/useAzureOpenAI}}

const { resetMessage } = require("./messages");
const { httpErrorAction, getCurrentWeather, getNickname } = require("./actions");

// Create AI components
// Use OpenAI
const planner = new preview.AssistantsPlanner({
{{#useOpenAI}}
  apiKey: config.openAIKey,
  assistant_id: config.openAIAssistantId,
{{/useOpenAI}}
 {{#useAzureOpenAI}}
  apiKey: config.azureOpenAIKey,
  assistant_id: config.azureOpenAIAssistantId,
  endpoint: config.azureOpenAIEndpoint
{{/useAzureOpenAI}}
});

// Define storage and application
const storage = new MemoryStorage();
const app = new Application({
  storage,
  ai: {
    planner,
  },
});

app.conversationUpdate("membersAdded", async (turnContext) => {
  const welcomeText = "How can I help you today?";
  for (const member of turnContext.activity.membersAdded) {
    if (member.id !== turnContext.activity.recipient.id) {
      await turnContext.sendActivity(MessageFactory.text(welcomeText));
    }
  }
});

app.message("reset", resetMessage);

app.ai.action(AI.HttpErrorActionName, httpErrorAction);
app.ai.action("getCurrentWeather", getCurrentWeather);
app.ai.action("getNickname", getNickname);

module.exports = app;
