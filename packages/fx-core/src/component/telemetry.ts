// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError } from "@microsoft/teamsfx-api";
import { TOOLS, globalVars } from "../core/globalVars";
import { TelemetryConstants } from "./constants";
import { fillInTelemetryPropsForFxError } from "../common/telemetry";

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
  const props = {
    ...getCommonProperties(),
    ...properties,
  };
  fillInTelemetryPropsForFxError(props, error);
  TOOLS.telemetryReporter?.sendTelemetryErrorEvent(eventName, props, measurements ?? {}, [
    TelemetryConstants.properties.errorMessage,
  ]);
}
