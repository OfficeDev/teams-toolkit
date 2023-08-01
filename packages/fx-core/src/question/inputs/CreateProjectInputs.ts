// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";

export interface CreateProject extends Inputs {
  /** @description Capabilities */
  capabilities?:
    | "bot"
    | "notification"
    | "command-bot"
    | "workflow-bot"
    | "tab-non-sso"
    | "sso-launch-page"
    | "dashboard-tab"
    | "tab-spfx"
    | "link-unfurling"
    | "search-app"
    | "message-extension";
  /** @description Select the trigger for `Chat Notification Message` app template. */
  "bot-host-type-trigger"?:
    | "http-restify"
    | "http-webapi"
    | "http-and-timer-functions"
    | "http-functions"
    | "timer-functions";
  /** @description Create a new or import an existing SharePoint Framework solution. */
  "spfx-solution"?: "new" | "import";
  /** @description Install latest SharePoint Framework version. */
  "spfx-install-latest-package"?: boolean;
  /** @description Framework */
  "spfx-framework-type"?: "react" | "minimal" | "none";
  /** @description Name for SharePoint Framework Web Part. */
  "spfx-webpart-name"?: string;
  /** @description Directory path that contains the existing SarePoint Framework solutions. */
  "spfx-folder"?: string;
  /** @description Existing add-in project folder */
  "addin-project-folder"?: string;
  /** @description Select import project manifest file */
  "addin-project-manifest"?: string;
  /** @description Add-in Host */
  "addin-host"?: string;
  /** @description OpenAPI Spec */
  "api-spec-location"?: string;
  /** @description OpenAI Plugin Manifest */
  "openai-plugin-manifest-location"?: string;
  /** @description Select an Operation */
  "api-operation"?: string[];
  /** @description Programming Language. */
  "programming-language"?: "javascript" | "typescript" | "csharp";
  /** @description Root folder of the project. */
  folder?: string;
  /** @description Application name */
  "app-name": string;
  /** @description Configure website URL(s) for debugging */
  replaceWebsiteUrl?: string[];
  /** @description Configure content URL(s) for debugging */
  replaceContentUrl?: string[];
  /** @description Create new bot(s) for debugging */
  replaceBotIds?: string[];
  /** @description Start from a sample */
  samples?:
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
}
