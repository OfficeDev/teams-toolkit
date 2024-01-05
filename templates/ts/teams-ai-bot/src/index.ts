// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Import required packages
import { config } from "dotenv";
import * as path from "path";
import * as restify from "restify";
import {
  Application,
  ActionPlanner,
  OpenAIModel,
  PromptManager,
  TurnState,
  Memory,
  DefaultConversationState,
} from "@microsoft/teams-ai";

import { OpenAPIClientAxios, Document } from "openapi-client-axios";
const fs = require("fs-extra");

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import {
  CardFactory,
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ConfigurationServiceClientCredentialFactory,
  MemoryStorage,
  TurnContext,
} from "botbuilder";
import yaml from "js-yaml";
const ACData = require("adaptivecards-templating");

// Read botFilePath and botFileSecret from .env file.
const ENV_FILE = path.join(__dirname, "..", ".env");
config({ path: ENV_FILE });

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
  {},
  new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: process.env.BOT_ID,
    MicrosoftAppPassword: process.env.BOT_PASSWORD,
    MicrosoftAppType: "MultiTenant",
  })
);

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const adapter = new CloudAdapter(botFrameworkAuthentication);

// Create storage to use
//const storage = new MemoryStorage();

// Catch-all for errors.
const onTurnErrorHandler = async (context: TurnContext, error: Error) => {
  // This check writes out errors to console log .vs. app insights.
  // NOTE: In production environment, you should consider logging this to Azure
  //       application insights.
  console.error(`\n [onTurnError] unhandled error: ${error.toString()}`);
  console.log(error);

  // Send a trace activity, which will be displayed in Bot Framework Emulator
  await context.sendTraceActivity(
    "OnTurnError Trace",
    `${error.toString()}`,
    "https://www.botframework.com/schemas/error",
    "TurnError"
  );

  // Send a message to the user
  await context.sendActivity("The bot encountered an error or bug.");
  await context.sendActivity("To continue to run this bot, please fix the bot source code.");
};

// Set the onTurnError for the singleton CloudAdapter.
adapter.onTurnError = onTurnErrorHandler;

// Create HTTP server.
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\n${server.name} listening to ${server.url}`);
  console.log("\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator");
  console.log("\nTo test your bot in Teams, sideload the app manifest.json within Teams Apps.");
});

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ConversationState extends DefaultConversationState {
  lightsOn: boolean;
}
type ApplicationTurnState = TurnState<ConversationState>;

if (!process.env.OPENAI_KEY && !process.env.AZURE_OPENAI_KEY) {
  throw new Error(
    "Missing environment variables - please check that OPENAI_KEY or AZURE_OPENAI_KEY is set."
  );
}

// Create AI components
const model = new OpenAIModel({
  // OpenAI Support
  apiKey: process.env.OPENAI_KEY!,
  defaultModel: "gpt-3.5-turbo",

  // Azure OpenAI Support
  azureApiKey: process.env.AZURE_OPENAI_KEY!,
  azureDefaultDeployment: "gpt-3.5-turbo",
  azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT!,
  azureApiVersion: "2023-03-15-preview",

  // Request logging
  logRequests: true,
});

const prompts = new PromptManager({
  promptsFolder: path.join(__dirname, "../src/prompts"),
});

const planner = new ActionPlanner({
  model,
  prompts,
  defaultPrompt: "sequence",
});

// Define storage and application
const storage = new MemoryStorage();
const app = new Application<ApplicationTurnState>({
  storage,
  ai: {
    planner,
  },
});

// Define a prompt function for getting the current status of the lights
planner.prompts.addFunction("getAction", async (context: TurnContext, memory: Memory) => {
  const specFilePath = path.join(__dirname, "../src/prompts/sequence/actions.json");
  const specFileContent = fs.readFileSync(specFilePath);
  return specFileContent.toString();
});

// TODO: determine the file name of spec file.
const specPath = path.join(__dirname, "../appPackage/apiSpecificationFile/{{OPENAPI_SPEC_PATH}}");
const specContent = yaml.load(fs.readFileSync(specPath, "utf8")) as Document;
const api = new OpenAPIClientAxios({ definition: specContent });
api.init();

// TODO: add function to add ai action.

// Listen for incoming server requests.
server.post("/api/messages", async (req: any, res: any) => {
  // Route received a request to adapter for processing
  await adapter.process(req, res as any, async (context: any) => {
    // Dispatch to application for routing
    await app.run(context);
  });
});
