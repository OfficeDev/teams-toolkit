// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, SystemError } from "@microsoft/teamsfx-api";
import { Result, err, ok } from "neverthrow";
import { RegisteredStep } from "../../pipeline/runScaffoldPipeline";
import { defineStep } from "../../pipeline/defineStep";
import { stringParam } from "../../pipeline/stepParams";

/** Declarative Agent manifest mutation steps for modify flows. */

const SOURCE = "Scaffold";

/** Engine step name `da-action/register-plugin-manifest`. */
export const STEP_REGISTER_PLUGIN_MANIFEST = "da-action/register-plugin-manifest";

function systemError(name: string, message: string): SystemError {
  return new SystemError({ source: SOURCE, name, message });
}

/** Registered step for adding a rendered API plugin manifest as a DA action. */
export const daActionRegisterPluginManifest: RegisteredStep = defineStep({
  parse(resolved): Result<{ teamsManifestPath: string; pluginManifestPath: string }, string> {
    const teamsManifestPath = stringParam(resolved, "teamsManifestPath");
    if (teamsManifestPath === undefined) {
      return err("missing string parameter 'teamsManifestPath'");
    }
    const pluginManifestPath = stringParam(resolved, "pluginManifestPath");
    if (pluginManifestPath === undefined) {
      return err("missing string parameter 'pluginManifestPath'");
    }
    return ok({ teamsManifestPath, pluginManifestPath });
  },
  invalidParams: () =>
    systemError("DaActionRegisterParams", "resolved parameters are not all strings"),
  apply({ teamsManifestPath, pluginManifestPath }, ctx): Result<void, FxError> {
    return ctx
      .manifestWrapper("declarativeAgent")
      .registerDeclarativeAgentAction(teamsManifestPath, pluginManifestPath);
  },
});
