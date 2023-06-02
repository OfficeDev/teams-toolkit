// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  ContextV3,
  FxError,
  Inputs,
  ProjectSettingsV3,
  TelemetryReporter,
  UserError,
} from "@microsoft/teamsfx-api";
import { cloneDeep } from "lodash";
import * as uuid from "uuid";
import { LocalCrypto } from "../core/crypto";
import { TOOLS } from "../core/globalVars";
import {
  ComponentNames,
  ProgrammingLanguage,
  Scenarios,
  SolutionTelemetryComponentName,
  SolutionTelemetryProperty,
} from "./constants";
import { DriverContext } from "./driver/interface/commonArgs";
import { DefaultManifestProvider } from "./resource/appManifest/manifestProvider";
import { getComponent, getComponentByScenario } from "./workflow";

export function newProjectSettingsV3(): ProjectSettingsV3 {
  const projectSettings: ProjectSettingsV3 = {
    appName: "test",
    projectId: uuid.v4(),
    version: "2.1.0",
    components: [],
  };
  return projectSettings;
}

export function createContextV3(projectSettings?: ProjectSettingsV3): ContextV3 {
  if (!projectSettings) projectSettings = newProjectSettingsV3();
  const context: ContextV3 = {
    userInteraction: TOOLS.ui,
    logProvider: TOOLS.logProvider,
    telemetryReporter: TOOLS.telemetryReporter!,
    cryptoProvider: new LocalCrypto(projectSettings?.projectId),
    permissionRequestProvider: TOOLS.permissionRequest,
    projectSetting: projectSettings,
    manifestProvider: new DefaultManifestProvider(),
    tokenProvider: TOOLS.tokenProvider,
  };
  return context;
}
export function createDriverContext(inputs: Inputs): DriverContext {
  const driverContext: DriverContext = {
    azureAccountProvider: TOOLS.tokenProvider!.azureAccountProvider,
    m365TokenProvider: TOOLS.tokenProvider!.m365TokenProvider,
    ui: TOOLS.ui,
    progressBar: undefined,
    logProvider: TOOLS.logProvider,
    telemetryReporter: TOOLS.telemetryReporter!,
    projectPath: inputs.projectPath!,
    platform: inputs.platform,
  };
  return driverContext;
}
export function normalizeName(appName: string): string {
  const normalizedAppName = appName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return normalizedAppName;
}

export const ComponentConnections = {
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

export function ensureComponentConnections(settingsV3: ProjectSettingsV3): void {
  const exists = (c: string) => getComponent(settingsV3, c) !== undefined;
  const existingConfigNames = Object.keys(ComponentConnections).filter(exists);
  for (const configName of existingConfigNames) {
    const existingResources = (ComponentConnections[configName] as string[]).filter(exists);
    const configs = settingsV3.components.filter((c) => c.name === configName);
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

export function isCSharpProject(programmingLanguage: string | undefined): boolean {
  return programmingLanguage === ProgrammingLanguage.CSharp;
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
