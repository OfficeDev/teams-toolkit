// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container } from "typedi";
 
export const SolutionPlugins = {
  AzureTeamsSolution: "fx-solution-azure"
};

/**
 * @returns all registered resource plugins
 */
export function getAllSolutionPlugins(): v2.SolutionPlugin[] {
  const plugins: v2.SolutionPlugin[] = [];
  for (const k in SolutionPlugins) {
    const plugin = Container.get<v2.SolutionPlugin>(k);
    if (plugin) {
      plugins.push(plugin);
    }
  }
  return plugins;
}
 
export function getSolutionPlugin(name: string): v2.SolutionPlugin{
  return Container.get<v2.SolutionPlugin>(name);
}