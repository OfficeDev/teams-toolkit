// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";

export interface CreateSampleProjectInputs extends Inputs {
  /** @description Start from a sample */
  samples:
    | "hello-world-tab-with-backend"
    | "graph-toolkit-contact-exporter"
    | "bot-sso"
    | "todo-list-SPFx"
    | "hello-world-in-meeting"
    | "todo-list-with-Azure-backend-M365"
    | "NPM-search-connector-M365"
    | "bot-proactive-messaging-teamsfx"
    | "adaptive-card-notification"
    | "incoming-webhook-notification"
    | "stocks-update-notification-bot"
    | "query-org-user-with-message-extension-sso"
    | "team-central-dashboard"
    | "graph-connector-app"
    | "graph-toolkit-one-productivity-hub"
    | "todo-list-with-Azure-backend"
    | "share-now"
    | "hello-world-teams-tab-and-outlook-add-in"
    | "outlook-add-in-set-signature"
    | "developer-assist-dashboard"
    | "live-share-dice-roller";
  /** @description Root folder of the project. */
  folder: string;
}
