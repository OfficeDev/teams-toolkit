// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AzureSolutionSettings, Plugin, returnUserError } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container } from "typedi";
import { SolutionError } from "./constants";

export const ResourcePlugins = {
  SpfxPlugin: "SpfxPlugin",
  FrontendPlugin: "FrontendPlugin",
  IdentityPlugin: "IdentityPlugin",
  SqlPlugin: "SqlPlugin",
  BotPlugin: "BotPlugin",
  AadPlugin: "AadPlugin",
  FunctionPlugin: "FunctionPlugin",
  LocalDebugPlugin: "LocalDebugPlugin",
  ApimPlugin: "ApimPlugin",
  AppStudioPlugin: "AppStudioPlugin",
  SimpleAuthPlugin: "SimpleAuthPlugin",
};

export const ResourcePluginsV2 = {
  SpfxPlugin: "SpfxPluginV2",
  FrontendPlugin: "FrontendPluginV2",
  IdentityPlugin: "IdentityPluginV2",
  SqlPlugin: "SqlPluginV2",
  BotPlugin: "BotPluginV2",
  AadPlugin: "AadPluginV2",
  FunctionPlugin: "FunctionPluginV2",
  LocalDebugPlugin: "LocalDebugPluginV2",
  ApimPlugin: "ApimPluginV2",
  AppStudioPlugin: "AppStudioPluginV2",
  SimpleAuthPlugin: "SimpleAuthPluginV2",
};

/**
 * @returns all registered resource plugins
 */
export function getAllResourcePlugins(): Plugin[] {
  const plugins: Plugin[] = [];
  for (const k in ResourcePlugins) {
    const plugin = Container.get<Plugin>(k);
    if (plugin) {
      plugins.push(plugin);
    }
  }
  return plugins;
}

/**
 *
 * @returns all registered resource plugin map
 */
export function getAllResourcePluginMap(): Map<string, Plugin> {
  const map = new Map<string, Plugin>();
  const allPlugins = getAllResourcePlugins();
  for (const p of allPlugins) {
    map.set(p.name, p);
  }
  return map;
}

/**
 * return activated resource plugin according to solution settings
 * @param solutionSettings Azure solution settings
 * @returns activated resource plugins
 */
export function getActivatedResourcePlugins(solutionSettings: AzureSolutionSettings): Plugin[] {
  const activatedPlugins = getAllResourcePlugins().filter(
    (p) => p.activate && p.activate(solutionSettings) === true
  );
  if (activatedPlugins.length === 0) {
    throw returnUserError(
      new Error(`No plugin selected`),
      "Solution",
      SolutionError.NoResourcePluginSelected
    );
  }
  return activatedPlugins;
}
