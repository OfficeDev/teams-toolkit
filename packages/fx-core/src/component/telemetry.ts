// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Component,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  SystemError,
} from "@microsoft/teamsfx-api";
import { TelemetryEvent, TelemetryProperty } from "../common/telemetry";
import { globalVars, TOOLS } from "../core/globalVars";
import { AzureSolutionQuestionNames } from "../plugins/solution/fx-solution/question";
import { TelemetryKeys } from "./resource/botService/constants";
import { PluginNames } from "../plugins/solution/fx-solution/constants";
import { ComponentNames, Scenarios, TelemetryConstants } from "./constants";
import { TelemetryHelper } from "./resource/botService/telemetryHelper";

export type TelemetryProps = { [key: string]: string };
export function getCommonProperties(): TelemetryProps {
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
  context: ContextV3,
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
  if (eventName === TelemetryEvent.Provision && context.envInfo?.envName === "local") {
    migrateProvision(
      (props) => {
        sendStartEvent(TelemetryEvent.LocalDebug, props, measurements);
      },
      context,
      properties
    );
    return;
  }
  if (eventName === TelemetryEvent.Provision && context.envInfo?.envName !== "local") {
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
  context: ContextV3,
  inputs: InputsWithProjectPath,
  properties?: TelemetryProps,
  measurements?: { [key: string]: number }
): void {
  if (!needMigrate(eventName, properties)) {
    return;
  }
  if (eventName === TelemetryEvent.AddFeature) {
    const componentName = properties?.[TelemetryProperty.Component] ?? "";
    let props: TelemetryProps = {
      ...properties,
      [TelemetryProperty.Component]: migrateComponentName(componentName),
    };
    if (componentName === ComponentNames.TeamsBot) {
      props = fulfillCommonBotProperties(
        props,
        context.projectSetting.components.find(
          (component) => component.name === ComponentNames.TeamsBot
        )
      );
    }
    sendSuccessEvent(TelemetryEvent.Scaffold, props, measurements);
    sendSuccessEvent(TelemetryEvent.GenerateBicep, props, measurements);
    return;
  }
  if (eventName === TelemetryEvent.Provision && context.envInfo?.envName === "local") {
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
  if (eventName === TelemetryEvent.Provision && context.envInfo?.envName !== "local") {
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
  context: ContextV3,
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
    sendErrorEvent(migrateEventName(eventName, context), error, props, measurements);
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

function migrateEventName(eventName: string, context: ContextV3): string {
  if (eventName === TelemetryEvent.AddFeature) {
    return TelemetryEvent.Scaffold;
  }
  if (eventName === TelemetryEvent.Provision && context.envInfo?.envName === "local") {
    return TelemetryEvent.LocalDebug;
  }
  return eventName;
}

function getMigrateComponents(context: ContextV3): Component[] {
  return context.projectSetting.components.filter((component) =>
    [ComponentNames.TeamsApi, ComponentNames.TeamsBot, ComponentNames.TeamsTab].includes(
      component.name
    )
  );
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
  context: ContextV3,
  inputs: InputsWithProjectPath,
  properties?: TelemetryProps
): void {
  let inputPlugins = inputs[AzureSolutionQuestionNames.PluginSelectionDeploy];
  if (!Array.isArray(inputPlugins)) {
    inputPlugins = context.projectSetting.components
      .filter((component) => component.deploy && component.hosting != undefined)
      .map((component) => migrateComponentName(component.name));
  }

  if (Array.isArray(inputPlugins)) {
    inputPlugins.forEach((pluginName) => {
      let props: TelemetryProps = {
        ...properties,
        [TelemetryProperty.Component]: migrateComponentName(pluginName),
      };
      if (pluginName === PluginNames.BOT) {
        props = fulfillCommonBotProperties(
          props,
          context.projectSetting.components.find(
            (component) => component.name === ComponentNames.TeamsBot
          )
        );
      }
      cb(props);
    });
  }
}

function migrateProvision(
  cb: (properties?: TelemetryProps) => void,
  context: ContextV3,
  properties?: TelemetryProps
): void {
  const components = getMigrateComponents(context);
  components.forEach((component) => {
    let props: TelemetryProps = {
      ...properties,
      [TelemetryProperty.Component]: migrateComponentName(component.name),
    };
    props = fulfillCommonBotProperties(props, component);
    cb(props);
  });
}

function fulfillCommonBotProperties(props: TelemetryProps, component?: Component): TelemetryProps {
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
