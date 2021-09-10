// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Solution, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container } from "typedi";

export const SolutionPlugins: any = {
  AzureTeamsSolution: "AzureTeamsSolution",
};

export const SolutionPluginsV2: any = {
  AzureTeamsSolutionV2: "AzureTeamsSolutionV2",
};

/**
 * @returns all registered resource plugins V2
 */
export function getAllSolutionPluginsV2(): v2.SolutionPlugin[] {
  const plugins: v2.SolutionPlugin[] = [];
  for (const k in SolutionPluginsV2) {
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

export function getSolutionPluginV2ByName(name: string): v2.SolutionPlugin | undefined {
  const solutions = getAllSolutionPluginsV2().filter((s) => s.name === name);
  if (solutions.length > 0) return solutions[0];
  return undefined;
}

export function getSolutionPluginByName(name: string): Solution | undefined {
  const solutions = getAllSolutionPlugins().filter((s) => s.name === name);
  if (solutions.length > 0) return solutions[0];
  return undefined;
}
