const { MemoryStorage } = require("botbuilder");
const path = require("path");
const config = require("../config");

// See https://aka.ms/teams-ai-library to learn more about the Teams AI library.
const { Application, ActionPlanner, OpenAIModel, PromptManager } = require("@microsoft/teams-ai");

// Create AI components
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

const { generateAdaptiveCard, addAuthConfig } = require("./utility.js");
const yaml = require("js-yaml");
const { OpenAPIClientAxios } = require("openapi-client-axios");
const fs = require("fs-extra");
// Define a prompt function for getting the current status of the lights
planner.prompts.addFunction("getAction", async (context, memory) => {
  const specFilePath = path.join(__dirname, "../prompts/chat/actions.json");
  const specFileContent = fs.readFileSync(specFilePath);
  return specFileContent.toString();
});
const specPath = path.join(__dirname, "../../appPackage/apiSpecificationFile/{{OPENAPI_SPEC_PATH}}");
const specContent = yaml.load(fs.readFileSync(specPath, "utf8"));
const api = new OpenAPIClientAxios({ definition: specContent });
api.init();

// Replace with action code

module.exports = app;
