// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, FxError, InputsWithProjectPath, SystemError } from "@microsoft/teamsfx-api";
import { TelemetryEvent, TelemetryProperty } from "../common/telemetry";
import { globalVars, TOOLS } from "../core/globalVars";
import {
  AzureSolutionQuestionNames,
  PluginNames,
  ComponentNames,
  Scenarios,
  TelemetryConstants,
} from "./constants";
import { TelemetryKeys } from "./resource/botService/constants";
import { TelemetryHelper } from "./resource/botService/telemetryHelper";

type TelemetryProps = { [key: string]: string };
function getCommonProperties(): TelemetryProps {
  const props = {
    [TelemetryConstants.properties.appId]: globalVars.teamsAppId,
    [TelemetryConstants.properties.tenantId]: globalVars.m365TenantId,
  };
  return props;
}

export function sendStartEvent(
  eventName: string,
  properties?: TelemetryProps,
  measurements?: { [key: string]: number }
): void {
  const props = {
    ...getCommonProperties(),
    ...properties,
  };
  TOOLS.telemetryReporter?.sendTelemetryEvent(eventName + "-start", props, measurements ?? {});
}

export function sendSuccessEvent(
  eventName: string,
  properties?: TelemetryProps,
  measurements?: { [key: string]: number }
): void {
  const props = {
    ...getCommonProperties(),
    ...properties,
    [TelemetryConstants.properties.success]: TelemetryConstants.values.yes,
  };
  TOOLS.telemetryReporter?.sendTelemetryEvent(eventName, props, measurements ?? {});
}

export function sendErrorEvent(
  eventName: string,
  error: FxError,
  properties?: TelemetryProps,
  measurements?: { [key: string]: number }
): void {
  const errorCode = error.source + "." + error.name;
  const errorType =
    error instanceof SystemError
      ? TelemetryConstants.values.systemError
      : TelemetryConstants.values.userError;
  const props = {
    ...getCommonProperties(),
    ...properties,
    [TelemetryConstants.properties.success]: TelemetryConstants.values.no,
    [TelemetryConstants.properties.errorCode]: errorCode,
    [TelemetryConstants.properties.errorType]: errorType,
    [TelemetryConstants.properties.errorMessage]: error.message,
  };
  TOOLS.telemetryReporter?.sendTelemetryErrorEvent(eventName, props, measurements ?? {}, [
    TelemetryConstants.properties.errorMessage,
  ]);
}

export function sendMigratedStartEvent(
  eventName: string,
  context: Context,
  inputs: InputsWithProjectPath,
  properties?: TelemetryProps,
  measurements?: { [key: string]: number }
): void {
  if (!needMigrate(eventName, properties)) {
    return;
  }
  if (eventName === TelemetryEvent.AddFeature) {
    const componentName = properties?.[TelemetryProperty.Component] ?? "";
    const props: TelemetryProps = {
      ...properties,
      [TelemetryProperty.Component]: migrateComponentName(componentName),
    };
    sendStartEvent(TelemetryEvent.Scaffold, props, measurements);
    sendStartEvent(TelemetryEvent.GenerateBicep, props, measurements);
    return;
  }
  if (eventName === TelemetryEvent.Provision && inputs.env === "local") {
    migrateProvision(
      (props) => {
        sendStartEvent(TelemetryEvent.LocalDebug, props, measurements);
      },
      context,
      properties
    );
    return;
  }
  if (eventName === TelemetryEvent.Provision && inputs.env !== "local") {
    migrateProvision(
      (props) => {
        sendStartEvent(TelemetryEvent.Provision, props, measurements);
      },
      context,
      properties
    );
    return;
  }
  if (eventName === TelemetryEvent.Deploy) {
    migrateDeploy(
      (props) => {
        sendStartEvent(TelemetryEvent.PreDeploy, props, measurements);
        sendSuccessEvent(TelemetryEvent.PreDeploy, props, measurements);
        sendStartEvent(TelemetryEvent.Deploy, props, measurements);
      },
      context,
      inputs,
      properties
    );
    return;
  }
}

export function sendMigratedSuccessEvent(
  eventName: string,
  context: Context,
  inputs: InputsWithProjectPath,
  properties?: TelemetryProps,
  measurements?: { [key: string]: number }
): void {
  if (!needMigrate(eventName, properties)) {
    return;
  }
  if (eventName === TelemetryEvent.AddFeature) {
    const componentName = properties?.[TelemetryProperty.Component] ?? "";
    const props: TelemetryProps = {
      ...properties,
      [TelemetryProperty.Component]: migrateComponentName(componentName),
    };
    sendSuccessEvent(TelemetryEvent.Scaffold, props, measurements);
    sendSuccessEvent(TelemetryEvent.GenerateBicep, props, measurements);
    return;
  }
  if (eventName === TelemetryEvent.Provision && inputs.env === "local") {
    migrateProvision(
      (props) => {
        sendSuccessEvent(TelemetryEvent.LocalDebug, props, measurements);
        sendStartEvent(TelemetryEvent.PostLocalDebug, props, measurements);
        sendSuccessEvent(TelemetryEvent.PostLocalDebug, props, measurements);
      },
      context,
      properties
    );
    return;
  }
  if (eventName === TelemetryEvent.Provision && inputs.env !== "local") {
    migrateProvision(
      (props) => {
        sendSuccessEvent(TelemetryEvent.Provision, props, measurements);
        sendStartEvent(TelemetryEvent.PostProvision, props, measurements);
        sendSuccessEvent(TelemetryEvent.PostProvision, props, measurements);
      },
      context,
      properties
    );
    return;
  }
  if (eventName === TelemetryEvent.Deploy) {
    migrateDeploy(
      (props) => sendSuccessEvent(eventName, props, measurements),
      context,
      inputs,
      properties
    );
    return;
  }
}

export function sendMigratedErrorEvent(
  eventName: string,
  error: FxError,
  context: Context,
  inputs: InputsWithProjectPath,
  properties?: TelemetryProps,
  measurements?: { [key: string]: number }
): void {
  if (!needMigrate(eventName, properties)) {
    return;
  }
  let props = { ...properties };
  let componentName;
  switch (error.source) {
    case "Storage":
      componentName = PluginNames.FE;
      break;
    case "WebApp":
      componentName = inputs?.["Scenario"] === Scenarios.Tab ? PluginNames.FE : PluginNames.BOT;
      break;
    case "Functions":
      componentName = inputs?.["Scenario"] === Scenarios.Api ? PluginNames.FUNC : PluginNames.BOT;
      break;
    case "BotService":
    case "BT":
      componentName = PluginNames.BOT;
      TelemetryHelper.fillAppStudioErrorProperty(error.innerError, props);
      break;
  }
  if (componentName) {
    props = { ...props, [TelemetryProperty.Component]: componentName };
    sendErrorEvent(migrateEventName(eventName), error, props, measurements);
  }
}

function needMigrate(eventName: string, properties?: TelemetryProps): boolean {
  const component = properties?.[TelemetryProperty.Component] ?? "";
  return (
    [ComponentNames.TeamsApi, ComponentNames.TeamsBot, ComponentNames.TeamsTab].includes(
      component
    ) ||
    (component === "core" &&
      eventName !== TelemetryEvent.AddFeature &&
      eventName !== TelemetryEvent.CreateProject)
  );
}

function migrateEventName(eventName: string): string {
  if (eventName === TelemetryEvent.AddFeature) {
    return TelemetryEvent.Scaffold;
  }
  if (eventName === TelemetryEvent.Provision) {
    return TelemetryEvent.LocalDebug;
  }
  return eventName;
}

function getMigrateComponents(): any[] {
  return [];
}

function migrateComponentName(componentName: string): string {
  switch (componentName) {
    case ComponentNames.TeamsApi:
      return PluginNames.FUNC;
    case ComponentNames.TeamsBot:
      return PluginNames.BOT;
    case ComponentNames.TeamsTab:
      return PluginNames.FE;
    default:
      return componentName;
  }
}

function migrateDeploy(
  cb: (properties?: TelemetryProps) => void,
  context: Context,
  inputs: InputsWithProjectPath,
  properties?: TelemetryProps
): void {
  const inputPlugins = inputs[AzureSolutionQuestionNames.PluginSelectionDeploy];
  if (Array.isArray(inputPlugins)) {
    inputPlugins.forEach((pluginName) => {
      const props: TelemetryProps = {
        ...properties,
        [TelemetryProperty.Component]: migrateComponentName(pluginName),
      };
      cb(props);
    });
  }
}

function migrateProvision(
  cb: (properties?: TelemetryProps) => void,
  context: Context,
  properties?: TelemetryProps
): void {
  const components = getMigrateComponents();
  components.forEach((component) => {
    let props: TelemetryProps = {
      ...properties,
      [TelemetryProperty.Component]: migrateComponentName(component.name),
    };
    props = fulfillCommonBotProperties(props, component);
    cb(props);
  });
}

function fulfillCommonBotProperties(props: TelemetryProps, component?: any): TelemetryProps {
  if (component?.name === ComponentNames.TeamsBot) {
    props = {
      ...props,
      [TelemetryKeys.HostType]:
        component?.hosting === ComponentNames.Function ? "azure-function" : "app-service",
      [TelemetryKeys.BotCapabilities]: component?.capabilities
        ? JSON.stringify(component.capabilities)
        : "",
    };
  }
  return props;
}
