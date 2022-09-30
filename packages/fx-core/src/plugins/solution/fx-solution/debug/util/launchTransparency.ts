// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as LaunchNext from "./launchNext";

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
  result[0].preLaunchTask = "Start Teams App Locally";
  result[1].preLaunchTask = "Start Teams App Locally";
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
  result[0].preLaunchTask = "Start Teams App Locally";
  result[1].preLaunchTask = "Start Teams App Locally";
  result[2].preLaunchTask = "Start Teams App Locally & Install App";
  result[3].preLaunchTask = "Start Teams App Locally & Install App";
  if (includeFrontend) {
    result[4].preLaunchTask = "Start Teams App Locally & Install App";
    result[5].preLaunchTask = "Start Teams App Locally & Install App";
  }
  return result;
}
