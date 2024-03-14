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
  azureDefaultDeployment: config.azureOpenAIDeployment,
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

import { generateAdaptiveCard, addAuthConfig } from "./utility";
import { TurnContext, ConversationState } from "botbuilder";
import { TurnState, Memory } from "@microsoft/teams-ai";
import yaml from "js-yaml";
import { OpenAPIClientAxios, Document } from "openapi-client-axios";
const fs = require("fs-extra");
type ApplicationTurnState = TurnState<ConversationState>;
// Define a prompt function for getting the current status of the lights
planner.prompts.addFunction("getAction", async (context: TurnContext, memory: Memory) => {
  const specFilePath = path.join(__dirname, "../prompts/chat/actions.json");
  const specFileContent = fs.readFileSync(specFilePath);
  return specFileContent.toString();
});
const specPath = path.join(__dirname, "../../appPackage/apiSpecificationFile/{{OPENAPI_SPEC_PATH}}");
const specContent = yaml.load(fs.readFileSync(specPath, "utf8")) as Document;
const api = new OpenAPIClientAxios({ definition: specContent });
api.init();

// Replace with action code

export default app;
