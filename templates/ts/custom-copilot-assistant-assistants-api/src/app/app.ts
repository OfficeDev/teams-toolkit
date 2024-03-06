import { MemoryStorage } from "botbuilder";

// See https://aka.ms/teams-ai-library to learn more about the Teams AI library.
import { Application, AI, preview } from "@microsoft/teams-ai";

import config from "../config";

// See README.md to prepare your own OpenAI Assistant
if (!config.openAIKey || !config.openAIAssistantId) {
  throw new Error(
    "Missing OPENAI_API_KEY or OPENAI_ASSISTANT_ID. See README.md to prepare your own OpenAI Assistant."
  );
}

import { resetMessage } from "./messages";
import { httpErrorAction, getCurrentWeather, getNickname } from "./actions";

// Create AI components
// Use OpenAI
const planner = new preview.AssistantsPlanner({
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

app.message("reset", resetMessage);

app.ai.action(AI.HttpErrorActionName, httpErrorAction);
app.ai.action("getCurrentWeather", getCurrentWeather);
app.ai.action("getNickname", getNickname);

export default app;
