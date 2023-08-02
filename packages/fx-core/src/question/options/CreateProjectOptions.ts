// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const CreateProjectOptions: CLICommandOption[] = [
  {
    name: "capability",
    questionName: "capabilities",
    type: "string",
    shortName: "c",
    description: "Specifies the Teams App capability.",
    required: true,
    choices: [
      "bot",
      "notification",
      "command-bot",
      "workflow-bot",
      "tab-non-sso",
      "sso-launch-page",
      "dashboard-tab",
      "tab-spfx",
      "link-unfurling",
      "search-app",
      "message-extension",
    ],
    choiceListCommand: "teamsfx list capabilities",
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
    shortName: "ss",
    description: "Create a new or import an existing SharePoint Framework solution.",
    default: "new",
    choices: ["new", "import"],
  },
  {
    name: "spfx-install-latest-package",
    type: "boolean",
    shortName: "sp",
    description: "Install latest SharePoint Framework version.",
    default: true,
  },
  {
    name: "spfx-framework-type",
    type: "string",
    shortName: "sfk",
    description: "Framework",
    default: "react",
    choices: ["react", "minimal", "none"],
  },
  {
    name: "spfx-webpart-name",
    type: "string",
    shortName: "sw",
    description: "Name for SharePoint Framework Web Part.",
    default: "helloworld",
  },
  {
    name: "spfx-folder",
    type: "string",
    shortName: "sf",
    description: "Directory path that contains the existing SarePoint Framework solutions.",
  },
  {
    name: "programming-language",
    type: "string",
    shortName: "l",
    description: "Programming Language.",
    default: "javascript",
    choices: ["javascript", "typescript", "csharp"],
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
