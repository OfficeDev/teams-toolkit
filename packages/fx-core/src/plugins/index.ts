// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ConfigMap, Inputs, PluginContext } from "../../../api/build";
import { Context } from "../../../api/build/v2";

export * from "./resource";
export * from "./solution";

export function V2Context2PluginContext(ctx: Context, inputs: Inputs): PluginContext {
  const pluginContext: PluginContext = {
    root: inputs.projectPath!,
    config: new ConfigMap(),
    configOfOtherPlugins: new Map<string, ConfigMap>(),
    projectSettings: ctx.projectSetting,
    answers: inputs,
    logProvider: ctx.logProvider,
    telemetryReporter: ctx.telemetryReporter,
    cryptoProvider: ctx.cryptoProvider,
    ui: ctx.userInteraction,
  };
  return pluginContext;
}
