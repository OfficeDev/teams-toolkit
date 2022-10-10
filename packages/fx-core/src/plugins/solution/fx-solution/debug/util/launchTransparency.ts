// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as Launch from "./launch";
import * as LaunchNext from "./launchNext";
import { TaskLabel } from "../../../../../common/local/constants";

export function generateLaunchJson(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean
): Record<string, unknown> {
  return {
    version: "0.2.0",
    configurations: generateConfigurations(includeFrontend, includeBackend, includeBot),
    compounds: generateCompounds(includeFrontend, includeBackend, includeBot),
  };
}

export function generateM365LaunchJson(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean
): Record<string, unknown> {
  return {
    version: "0.2.0",
    configurations: generateM365Configurations(includeFrontend, includeBackend, includeBot),
    compounds: generateM365Compounds(includeFrontend, includeBackend, includeBot),
  };
}

export function generateConfigurations(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean
): Record<string, unknown>[] {
  return LaunchNext.generateConfigurations(includeFrontend, includeBackend, includeBot);
}

export function generateCompounds(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean
): Record<string, unknown>[] {
  const result = LaunchNext.generateCompounds(includeFrontend, includeBackend, includeBot);
  result[0].preLaunchTask = TaskLabel.Overall;
  result[1].preLaunchTask = TaskLabel.Overall;
  return result;
}

export function generateM365Configurations(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean
): Record<string, unknown>[] {
  return LaunchNext.generateM365Configurations(includeFrontend, includeBackend, includeBot);
}

export function generateM365Compounds(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean
): Record<string, unknown>[] {
  const result = LaunchNext.generateM365Compounds(includeFrontend, includeBackend, includeBot);
  result[0].preLaunchTask = TaskLabel.Overall;
  result[1].preLaunchTask = TaskLabel.Overall;
  result[2].preLaunchTask = TaskLabel.M365Overall;
  result[3].preLaunchTask = TaskLabel.M365Overall;
  if (includeFrontend) {
    result[4].preLaunchTask = TaskLabel.M365Overall;
    result[5].preLaunchTask = TaskLabel.M365Overall;
  }
  return result;
}

export function generateSpfxConfigurations(): Record<string, unknown>[] {
  return Launch.generateSpfxConfigurations();
}

export function generateSpfxCompounds(): Record<string, unknown>[] {
  const result = Launch.generateSpfxCompounds();
  result[0].preLaunchTask = TaskLabel.Overall;
  result[1].preLaunchTask = TaskLabel.Overall;
  return result;
}
