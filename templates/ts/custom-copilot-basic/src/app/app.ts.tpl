import { MemoryStorage } from "botbuilder";
import * as path from "path";
import config from "../config";

// See https://aka.ms/teams-ai-library to learn more about the Teams AI library.
import { Application, ActionPlanner, OpenAIModel, PromptManager } from "@microsoft/teams-ai";

const model = new OpenAIModel({
  {{#useOpenAI}}
  apiKey: config.openAIKey,
  defaultModel: "gpt-3.5-turbo",
  {{/useOpenAI}}
  {{#useAzureOpenAI}}
  azureApiKey: config.azureOpenAIKey,
  azureDefaultDeployment: "gpt-35-turbo",
  azureEndpoint: config.azureOpenAIEndpoint,
  {{/useAzureOpenAI}}

  useSystemMessages: true,
  logRequests: true,
});
const prompts = new PromptManager({
  promptsFolder: path.join(__dirname, "../prompts"),
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

export default app;
