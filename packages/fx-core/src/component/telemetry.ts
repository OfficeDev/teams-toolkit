// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError } from "@microsoft/teamsfx-api";
import { TOOLS, globalVars } from "../common/globalVars";
import { TelemetryProperty, TelemetrySuccess, telemetryUtils } from "../common/telemetry";

type TelemetryProps = { [key: string]: string };
function getCommonProperties(): TelemetryProps {
  const props = {
    [TelemetryProperty.AppId]: globalVars.teamsAppId,
    [TelemetryProperty.TenantId]: globalVars.m365TenantId,
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
    [TelemetryProperty.Success]: TelemetrySuccess.Yes,
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
  telemetryUtils.fillInErrorProperties(props, error);
  TOOLS.telemetryReporter?.sendTelemetryErrorEvent(eventName, props, measurements ?? {}, [
    TelemetryProperty.ErrorMessage,
  ]);
}
