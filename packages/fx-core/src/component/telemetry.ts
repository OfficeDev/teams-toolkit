// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ContextV3, FxError, InputsWithProjectPath, SystemError } from "@microsoft/teamsfx-api";
import { globalVars, TOOLS } from "../core/globalVars";
import { TelemetryConstants } from "./constants";

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
  TOOLS.logProvider.info(
    `Send telemetry event ${eventName}-start, props: ${JSON.stringify(
      props
    )}, measurements: ${JSON.stringify(measurements ?? {})}`
  );
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
  TOOLS.logProvider.info(
    `Send telemetry event ${eventName}, props: ${JSON.stringify(
      props
    )}, measurements: ${JSON.stringify(measurements ?? {})}`
  );
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
  TOOLS.logProvider.info(
    `Send telemetry event ${eventName}, props: ${JSON.stringify(
      props
    )}, measurements: ${JSON.stringify(measurements ?? {})}`
  );
  TOOLS.telemetryReporter?.sendTelemetryErrorEvent(eventName, props, measurements ?? {}, [
    TelemetryConstants.properties.errorMessage,
  ]);
}

export function sendMigratedEvent(
  context: ContextV3,
  inputs: InputsWithProjectPath,
  eventName: string,
  properties?: TelemetryProps,
  measurements?: { [key: string]: number }
): void {}
