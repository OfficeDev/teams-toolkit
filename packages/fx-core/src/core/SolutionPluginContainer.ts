// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Solution, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container } from "typedi";

export const SolutionPlugins = {
  AzureTeamsSolution: "fx-solution-azure",
};

export const SolutionPluginsV2 = {
  AzureTeamsSolutionV2: "fx-solution-azure-v2",
};

/**
 * @returns all registered resource plugins V2
 */
export function getAllSolutionPluginsV2(): v2.SolutionPlugin[] {
  const plugins: v2.SolutionPlugin[] = [];
  for (const k in SolutionPlugins) {
    const plugin = Container.get<v2.SolutionPlugin>(k);
    if (plugin) {
      plugins.push(plugin);
    }
  }
  return plugins;
}

/**
 * @returns all registered resource plugins
 */
export function getAllSolutionPlugins(): Solution[] {
  const plugins: Solution[] = [];
  for (const k in SolutionPlugins) {
    const plugin = Container.get<Solution>(k);
    if (plugin) {
      plugins.push(plugin);
    }
  }
  return plugins;
}

export function getSolutionPluginV2(name: string): v2.SolutionPlugin {
  return Container.get<v2.SolutionPlugin>(name);
}

export function getSolutionPlugin(name: string): Solution {
  return Container.get<Solution>(name);
}
