// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/****************************************************************************************
 *                            NOTICE: AUTO-GENERATED                                    *
 ****************************************************************************************
 * This file is automatically generated by script "./src/question/generator.ts".        *
 * Please don't manually change its contents, as any modifications will be overwritten! *
 ***************************************************************************************/

import { Inputs } from "@microsoft/teamsfx-api";

export interface CreateProjectInputs extends Inputs {
  /** @description Teams Toolkit: select runtime for your app */
  runtime?: "node" | "dotnet";
  /** @description New Project */
  "project-type"?: "bot-type" | "tab-type" | "me-type" | "outlook-addin-type";
  /** @description Capabilities */
  capabilities?:
    | "bot"
    | "ai-bot"
    | "notification"
    | "command-bot"
    | "workflow-bot"
    | "tab-non-sso"
    | "sso-launch-page"
    | "dashboard-tab"
    | "tab-spfx"
    | "link-unfurling"
    | "search-app"
    | "collect-form-message-extension"
    | "copilot-plugin-new-api"
    | "copilot-plugin-existing-api"
    | "copilot-plugin-openai-plugin"
    | "search-message-extension";
  /** @description Choose triggers */
  "bot-host-type-trigger"?:
    | "http-restify"
    | "http-webapi"
    | "http-and-timer-functions"
    | "http-functions"
    | "timer-functions";
  /** @description SharePoint Solution */
  "spfx-solution"?: "new" | "import";
  /** @description SharePoint Framework */
  "spfx-install-latest-package"?: boolean;
  /** @description Framework */
  "spfx-framework-type"?: "react" | "minimal" | "none";
  /** @description Name for SharePoint Framework Web Part */
  "spfx-webpart-name"?: string;
  /** @description SPFx solution folder */
  "spfx-folder"?: string;
  /** @description OpenAPI Spec */
  "openapi-spec-location"?: string;
  /** @description OpenAI Plugin Manifest */
  "openai-plugin-domain"?: string;
  /** @description Select an Operation */
  "api-operation"?: string[];
  /** @description Programming Language. */
  "programming-language"?: "javascript" | "typescript" | "csharp";
  /** @description Application name */
  "app-name"?: string;
}
