// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ServiceType } from "../../../../common/azure-hosting/interfaces";
import { BotNotificationTriggers } from "../../../solution";
import { TemplateProjectsScenarios } from "../constants";
import { HostTypes } from "../resources/strings";

export const runtimeMap: { [key: string]: string } = {
  js: "node",
  ts: "node",
  csharp: "dotnet",
};

export const serviceMap: { [key: string]: ServiceType } = {
  [HostTypes.APP_SERVICE]: ServiceType.AppService,
  [HostTypes.AZURE_FUNCTIONS]: ServiceType.Functions,
};

export const langMap: { [key: string]: string } = {
  javascript: "js",
  typescript: "ts",
  csharp: "csharp",
};

export const triggerScenarioMap: { [key: string]: string } = {
  [BotNotificationTriggers.Http]:
    TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_HTTP_SCENARIO_NAME,
  [BotNotificationTriggers.Timer]:
    TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_TIMER_SCENARIO_NAME,
};
