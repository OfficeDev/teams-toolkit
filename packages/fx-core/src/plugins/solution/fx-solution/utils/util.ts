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
  v3,
  Result,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { SolutionTelemetryComponentName, SolutionTelemetryProperty } from "../constants";
import { BuiltInFeaturePluginNames } from "../v3/constants";
import { ComponentNames } from "../../../../component/constants";
import { updateAzureParameters } from "../arm";

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
  if (!solutionCtx.envInfo.state.has(pluginIdentifier)) {
    solutionCtx.envInfo.state.set(pluginIdentifier, new ConfigMap());
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const pluginConfig: PluginConfig = solutionCtx.envInfo.state.get(pluginIdentifier)!;
  const pluginCtx: PluginContext = {
    ...baseCtx,
    envInfo: solutionCtx.envInfo,
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

export function hasBotServiceCreated(envInfo: v3.EnvInfoV3): boolean {
  if (!envInfo || !envInfo.state) {
    return false;
  }

  return (
    (!!envInfo.state[BuiltInFeaturePluginNames.bot] &&
      !!envInfo.state[BuiltInFeaturePluginNames.bot]["resourceId"]) ||
    (!!envInfo.state[ComponentNames.TeamsBot] &&
      !!envInfo.state[ComponentNames.TeamsBot]["resourceId"])
  );
}

export async function handleConfigFilesWhenSwitchAccount(
  envInfo: v3.EnvInfoV3,
  appName: string,
  projectPath: string,
  hasSwitchedM365Tenant: boolean,
  hasSwitchedSubscription: boolean,
  hasBotServiceCreatedBefore: boolean
): Promise<Result<undefined, FxError>> {
  // TODO: backup old files.
  const updateAzureParametersRes = await updateAzureParameters(
    projectPath,
    appName,
    envInfo.envName,
    hasSwitchedSubscription,
    hasSwitchedM365Tenant,
    hasBotServiceCreatedBefore
  );
  if (updateAzureParametersRes.isErr()) {
    return err(updateAzureParametersRes.error);
  }

  return ok(undefined);
}
