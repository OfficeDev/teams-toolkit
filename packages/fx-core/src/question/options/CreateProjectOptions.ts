// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/****************************************************************************************
 *                            NOTICE: AUTO-GENERATED                                    *
 ****************************************************************************************
 * This file is automatically generated by script "./src/question/generator.ts".        *
 * Please don't manually change its contents, as any modifications will be overwritten! *
 ***************************************************************************************/

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const CreateProjectOptions: CLICommandOption[] = [
  {
    name: "runtime",
    type: "string",
    description: "Teams Toolkit: select runtime for your app",
    default: "node",
    hidden: true,
    choices: ["node", "dotnet"],
  },
  {
    name: "capability",
    questionName: "capabilities",
    type: "string",
    shortName: "c",
    description: "Specifies the Microsoft Teams App capability.",
    required: true,
    choices: [
      "bot",
      "ai-bot",
      "ai-assistant-bot",
      "notification",
      "command-bot",
      "workflow-bot",
      "tab-non-sso",
      "sso-launch-page",
      "dashboard-tab",
      "tab-spfx",
      "search-app",
      "collect-form-message-extension",
      "search-message-extension",
      "link-unfurling",
      "copilot-plugin-new-api",
      "copilot-plugin-existing-api",
      "copilot-plugin-openai-plugin",
    ],
    choiceListCommand: "teamsapp list templates",
  },
  {
    name: "bot-host-type-trigger",
    type: "string",
    shortName: "t",
    description: "Specifies the trigger for `Chat Notification Message` app template.",
    default: "http-restify",
    choices: [
      "http-restify",
      "http-webapi",
      "http-and-timer-functions",
      "http-functions",
      "timer-functions",
    ],
  },
  {
    name: "spfx-solution",
    type: "string",
    shortName: "s",
    description: "Create a new or import an existing SharePoint Framework solution.",
    default: "new",
    choices: ["new", "import"],
  },
  {
    name: "spfx-install-latest-package",
    type: "boolean",
    description: "Install the latest version of SharePoint Framework.",
    default: true,
  },
  {
    name: "spfx-framework-type",
    type: "string",
    shortName: "k",
    description: "Framework.",
    default: "react",
    choices: ["react", "minimal", "none"],
  },
  {
    name: "spfx-webpart-name",
    type: "string",
    shortName: "w",
    description: "Name for SharePoint Framework Web Part.",
    default: "helloworld",
  },
  {
    name: "spfx-folder",
    type: "string",
    description: "Directory or Path that contains the existing SharePoint Framework solution.",
  },
  {
    name: "addin-host",
    type: "string",
    description: "Add-in Host",
    default: "No Options",
  },
  {
    name: "me-architecture",
    type: "string",
    shortName: "m",
    description: "Architecture of Search Based Message Extension.",
    default: "new-api",
    choices: ["new-api", "api-spec", "bot-plugin", "bot"],
  },
  {
    name: "openapi-spec-location",
    type: "string",
    shortName: "a",
    description: "OpenAPI description document location.",
  },
  {
    name: "openai-plugin-manifest",
    type: "string",
    shortName: "m",
    description: "OpenAI plugin website domain or manifest URL.",
  },
  {
    name: "api-operation",
    type: "array",
    shortName: "o",
    description: "Select Operation(s) Teams Can Interact with.",
  },
  {
    name: "api-me-auth",
    type: "string",
    description: "The authentication type for the API.",
    default: "none",
    choices: ["none", "api-key"],
  },
  {
    name: "programming-language",
    type: "string",
    shortName: "l",
    description: "Programming Language",
    default: "javascript",
    choices: ["javascript", "typescript", "csharp"],
  },
  {
    name: "office-addin-framework-type",
    type: "string",
    shortName: "f",
    description: "Framework for WXP extension.",
    default: "default",
    choices: ["default", "react"],
  },
  {
    name: "folder",
    type: "string",
    shortName: "f",
    description: "Directory where the project folder will be created in.",
    required: true,
    default: "./",
  },
  {
    name: "app-name",
    type: "string",
    shortName: "n",
    description: "Application name",
    required: true,
  },
];
export const CreateProjectArguments: CLICommandArgument[] = [];
