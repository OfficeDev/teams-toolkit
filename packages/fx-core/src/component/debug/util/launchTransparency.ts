// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { TaskOverallLabel } from "../../../common/local/constants";
import * as Launch from "./launch";
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
  result[0].preLaunchTask = TaskOverallLabel.TransparentDefault;
  result[1].preLaunchTask = TaskOverallLabel.TransparentDefault;
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
  result[0].preLaunchTask = TaskOverallLabel.TransparentDefault;
  result[1].preLaunchTask = TaskOverallLabel.TransparentDefault;
  result[2].preLaunchTask = TaskOverallLabel.TransparentM365;
  result[3].preLaunchTask = TaskOverallLabel.TransparentM365;
  if (includeFrontend) {
    result[4].preLaunchTask = TaskOverallLabel.TransparentM365;
    result[5].preLaunchTask = TaskOverallLabel.TransparentM365;
  }
  return result;
}

export function generateSpfxConfigurations(): Record<string, unknown>[] {
  return Launch.generateSpfxConfigurations();
}

export function generateSpfxCompounds(): Record<string, unknown>[] {
  const result = Launch.generateSpfxCompounds();
  return result;
}
