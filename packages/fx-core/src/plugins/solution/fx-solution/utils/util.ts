// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  PluginConfig,
  SolutionContext,
  PluginContext,
  Context,
  ConfigMap,
  FxError,
  TelemetryReporter,
  UserError,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { SolutionTelemetryComponentName, SolutionTelemetryProperty } from "../constants";
import * as fs from "fs-extra";

/**
 * A helper function to construct a plugin's context.
 * @param solutionCtx solution context
 * @param pluginIdentifier plugin name
 */
export function getPluginContext(
  solutionCtx: SolutionContext,
  pluginIdentifier: string
): PluginContext {
  const baseCtx: Context = solutionCtx;
  if (!solutionCtx.envInfo.profile.has(pluginIdentifier)) {
    solutionCtx.envInfo.profile.set(pluginIdentifier, new ConfigMap());
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const pluginConfig: PluginConfig = solutionCtx.envInfo.profile.get(pluginIdentifier)!;
  const pluginCtx: PluginContext = {
    ...baseCtx,
    configOfOtherPlugins: solutionCtx.envInfo.profile,
    config: pluginConfig,
  };
  return pluginCtx;
}

/**
 * A curry-ed version of getPluginContext
 * @param solutionCtx solution context
 */
export function getPluginContextConstructor(
  solutionCtx: SolutionContext
): (pluginIdentifier: string) => PluginContext {
  return function (pluginIdentifier: string): PluginContext {
    return getPluginContext(solutionCtx, pluginIdentifier);
  };
}

export async function getSubsriptionDisplayName(
  azureToken: TokenCredentialsBase,
  subscriptionId: string
): Promise<string | undefined> {
  const client = new SubscriptionClient(azureToken);
  const subscription = await client.subscriptions.get(subscriptionId);
  return subscription.displayName;
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
