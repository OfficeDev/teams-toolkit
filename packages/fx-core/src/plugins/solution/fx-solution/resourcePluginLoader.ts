// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureSolutionSettings,
  FxError,
  Result,
  Plugin,
  ok,
  err,
  returnUserError,
  UserError,
} from "@microsoft/teamsfx-api";

/**
 * 1: add import statement
 */
import { SpfxPlugin } from "../../resource/spfx";
import { FrontendPlugin } from "../../resource/frontend";
import { IdentityPlugin } from "../../resource/identity";
import { SqlPlugin } from "../../resource/sql";
import { TeamsBot } from "../../resource/bot";
import { AadAppForTeamsPlugin } from "../../resource/aad";
import { FunctionPlugin } from "../../resource/function";
import { SimpleAuthPlugin } from "../../resource/simpleauth";
import { LocalDebugPlugin } from "../../resource/localdebug";
import { ApimPlugin } from "../../resource/apim";
import { AppStudioPlugin } from "../../resource/appstudio";
import { SolutionError } from "./constants";

/**
 * 2: add new plugin statement
 */
export function createAllResourcePlugins(): Result<Plugin[], FxError> {
  const plugins: Plugin[] = [
    new SpfxPlugin(),
    new FrontendPlugin(),
    new IdentityPlugin(),
    new SqlPlugin(),
    new TeamsBot(),
    new AadAppForTeamsPlugin(),
    new FunctionPlugin(),
    new SimpleAuthPlugin(),
    new LocalDebugPlugin(),
    new ApimPlugin(),
    new AppStudioPlugin(),
  ];
  return ok(plugins);
}

export function createAllResourcePluginsMap(): Result<Map<string, Plugin>, FxError> {
  const res1 = createAllResourcePlugins();
  if (res1.isErr()) return err(res1.error);
  const map = new Map<string, Plugin>();
  for (const p of res1.value) {
    map.set(p.name, p);
  }
  return ok(map);
}

export function loadActivatedResourcePlugins(
  solutionSettings: AzureSolutionSettings
): Result<Plugin[], FxError> {
  const res1 = createAllResourcePluginsMap();
  if (res1.isErr()) return err(res1.error);
  const allPlugins = res1.value;
  let activatedPlugins: Plugin[] = [];
  if (solutionSettings.activeResourcePlugins && solutionSettings.activeResourcePlugins.length > 0) {
    // load existing config
    for (const p of solutionSettings.activeResourcePlugins) {
      const plugin = allPlugins.get(p);
      if (plugin === undefined) {
        return err(
          returnUserError(
            new Error(`Plugin name ${p} is not valid`),
            "Solution",
            SolutionError.PluginNotFound
          )
        );
      }
      activatedPlugins.push(plugin);
    }
  } // create from zero
  else {
    activatedPlugins = Array.from(allPlugins)
      .filter((p) => p[1].activate && p[1].activate(solutionSettings) === true)
      .map((p) => p[1]);
  }
  if (activatedPlugins.length === 0) {
    return err(
      returnUserError(
        new Error(`No plugin selected`),
        "Solution",
        SolutionError.NoResourcePluginSelected
      )
    );
  }
  return ok(activatedPlugins);
}
