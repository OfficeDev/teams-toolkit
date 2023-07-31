// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const CreateProjectOptions: CLICommandOption[] = [
  {
    name: "scratch",
    type: "singleSelect",
    description: "Teams Toolkit: Create a New App",
    required: true,
    choices: ["yes", "no"],
  },
  {
    name: "runtime",
    type: "singleSelect",
    description: "Teams Toolkit: select runtime for your app",
    choices: ["node", "dotnet"],
  },
  {
    name: "capabilities",
    type: "singleSelect",
    description: "capabilities",
  },
  {
    name: "bot-host-type-trigger",
    type: "singleSelect",
    description: "Choose triggers",
  },
  {
    name: "spfx-solution",
    type: "singleSelect",
    description: "SharePoint Solution",
    choices: ["new", "import"],
  },
  {
    name: "spfx-install-latest-package",
    type: "singleSelect",
    description: "SharePoint Framework",
  },
  {
    name: "spfx-framework-type",
    type: "singleSelect",
    description: "Framework",
    choices: ["react", "minimal", "none"],
  },
  {
    name: "spfx-webpart-name",
    type: "text",
    description: "Web Part Name",
  },
  {
    name: "spfx-folder",
    type: "text",
    description: "SPFx solution folder",
  },
  {
    name: "addin-project-folder",
    type: "text",
    description: "Existing add-in project folder",
  },
  {
    name: "addin-project-manifest",
    type: "text",
    description: "Select import project manifest file",
  },
  {
    name: "addin-host",
    type: "singleSelect",
    description: "Add-in Host",
  },
  {
    name: "api-spec-location",
    type: "text",
    description: "OpenAPI Spec",
  },
  {
    name: "openai-plugin-manifest-location",
    type: "text",
    description: "OpenAI Plugin Manifest",
  },
  {
    name: "api-operation",
    type: "multiSelect",
    description: "Select an Operation",
  },
  {
    name: "programming-language",
    type: "singleSelect",
    description: "Programming Language",
  },
  {
    name: "folder",
    type: "text",
    description: "Workspace folder",
  },
  {
    name: "app-name",
    type: "text",
    description: "Application name",
  },
  {
    name: "replaceWebsiteUrl",
    type: "multiSelect",
    description: "Configure website URL(s) for debugging",
  },
  {
    name: "replaceContentUrl",
    type: "multiSelect",
    description: "Configure content URL(s) for debugging",
  },
  {
    name: "replaceBotIds",
    type: "multiSelect",
    description: "Create new bot(s) for debugging",
  },
  {
    name: "samples",
    type: "singleSelect",
    description: "Start from a sample",
  },
];
export const CreateProjectArguments: CLICommandArgument[] = [];
