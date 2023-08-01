// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const CreateSampleProjectOptions: CLICommandOption[] = [];
export const CreateSampleProjectArguments: CLICommandArgument[] = [
  {
    name: "sample-name",
    questionName: "samples",
    type: "singleSelect",
    description: "Specifies the Teams App sample name.",
    required: true,
    choices: [
      "hello-world-tab-with-backend",
      "graph-toolkit-contact-exporter",
      "bot-sso",
      "todo-list-SPFx",
      "hello-world-in-meeting",
      "todo-list-with-Azure-backend-M365",
      "NPM-search-connector-M365",
      "bot-proactive-messaging-teamsfx",
      "adaptive-card-notification",
      "incoming-webhook-notification",
      "stocks-update-notification-bot",
      "query-org-user-with-message-extension-sso",
      "team-central-dashboard",
      "graph-connector-app",
      "graph-toolkit-one-productivity-hub",
      "todo-list-with-Azure-backend",
      "share-now",
      "hello-world-teams-tab-and-outlook-add-in",
      "outlook-add-in-set-signature",
      "developer-assist-dashboard",
      "live-share-dice-roller",
    ],
    choiceListCommand: "teamsfx list samples",
  },
];
