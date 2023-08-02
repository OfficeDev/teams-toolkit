// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Context, FxError, Inputs, TelemetryReporter, UserError } from "@microsoft/teamsfx-api";
import { cloneDeep } from "lodash";
import { TOOLS } from "../core/globalVars";
import {
  ComponentNames,
  Scenarios,
  SolutionTelemetryComponentName,
  SolutionTelemetryProperty,
} from "./constants";
import { DriverContext } from "./driver/interface/commonArgs";
import { getComponent, getComponentByScenario } from "./workflow";

export function createContextV3(): Context {
  const context: Context = {
    userInteraction: TOOLS.ui,
    logProvider: TOOLS.logProvider,
    telemetryReporter: TOOLS.telemetryReporter!,
    tokenProvider: TOOLS.tokenProvider,
  };
  return context;
}
export function createDriverContext(inputs: Inputs): DriverContext {
  const driverContext: DriverContext = {
    azureAccountProvider: TOOLS.tokenProvider.azureAccountProvider,
    m365TokenProvider: TOOLS.tokenProvider.m365TokenProvider,
    ui: TOOLS.ui,
    progressBar: undefined,
    logProvider: TOOLS.logProvider,
    telemetryReporter: TOOLS.telemetryReporter!,
    projectPath: inputs.projectPath!,
    platform: inputs.platform,
  };
  return driverContext;
}

const ComponentConnections = {
  [ComponentNames.AzureWebApp]: [
    ComponentNames.Identity,
    ComponentNames.AzureSQL,
    ComponentNames.KeyVault,
    ComponentNames.AadApp,
    ComponentNames.TeamsTab,
    ComponentNames.TeamsBot,
    ComponentNames.TeamsApi,
  ],
  [ComponentNames.Function]: [
    ComponentNames.Identity,
    ComponentNames.AzureSQL,
    ComponentNames.KeyVault,
    ComponentNames.AadApp,
    ComponentNames.TeamsTab,
    ComponentNames.TeamsBot,
    ComponentNames.TeamsApi,
  ],
  [ComponentNames.APIM]: [ComponentNames.TeamsTab, ComponentNames.TeamsBot],
};

export function ensureComponentConnections(settingsV3: any): void {
  const exists = (c: string) => getComponent(settingsV3, c) !== undefined;
  const existingConfigNames = Object.keys(ComponentConnections).filter(exists);
  for (const configName of existingConfigNames) {
    const existingResources = ComponentConnections[configName].filter(exists);
    const configs = settingsV3.components.filter((c: any) => c.name === configName);
    for (const config of configs) {
      config.connections = cloneDeep(existingResources);
    }
  }
  if (
    getComponent(settingsV3, ComponentNames.TeamsApi) &&
    getComponent(settingsV3, ComponentNames.APIM)
  ) {
    const functionConfig = getComponentByScenario(
      settingsV3,
      ComponentNames.Function,
      Scenarios.Api
    );
    functionConfig?.connections?.push(ComponentNames.APIM);
  }
}

export function sendErrorTelemetryThenReturnError(
  eventName: string,
  error: FxError,
  reporter?: TelemetryReporter,
  properties?: { [p: string]: string },
  measurements?: { [p: string]: number },
  errorProps?: string[]
): FxError {
  if (!properties) {
    properties = {};
  }

  if (SolutionTelemetryProperty.Component in properties === false) {
    properties[SolutionTelemetryProperty.Component] = SolutionTelemetryComponentName;
  }

  properties[SolutionTelemetryProperty.Success] = "no";
  if (error instanceof UserError) {
    properties["error-type"] = "user";
  } else {
    properties["error-type"] = "system";
  }

  properties["error-code"] = `${error.source}.${error.name}`;
  properties["error-message"] = error.message;

  reporter?.sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);
  return error;
}
