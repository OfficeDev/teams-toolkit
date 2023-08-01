// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";

export interface CreateProjectInputs extends Inputs {
  /** @description Capabilities */
  capabilities:
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
  "spfx-install-latest-package": boolean;
  /** @description Framework */
  "spfx-framework-type": "react" | "minimal" | "none";
  /** @description Name for SharePoint Framework Web Part. */
  "spfx-webpart-name": string;
  /** @description Directory path that contains the existing SarePoint Framework solutions. */
  "spfx-folder"?: string;
  /** @description Existing add-in project folder */
  "addin-project-folder": string;
  /** @description Select import project manifest file */
  "addin-project-manifest": string;
  /** @description Add-in Host */
  "addin-host"?: string;
  /** @description OpenAPI Spec */
  "api-spec-location"?: string;
  /** @description OpenAI Plugin Manifest */
  "openai-plugin-manifest-location"?: string;
  /** @description Select an Operation */
  "api-operation": string[];
  /** @description Programming Language. */
  "programming-language"?: "javascript" | "typescript" | "csharp";
  /** @description Root folder of the project. */
  folder: string;
  /** @description Application name */
  "app-name": string;
}
