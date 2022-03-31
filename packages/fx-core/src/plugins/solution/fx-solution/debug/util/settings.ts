// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export function generateSettings(includeFunctions: boolean): Record<string, unknown> {
  /**
   * Default settings for extensions
   */
  const settings: Record<string, unknown> = {
    "debug.onTaskErrors": "abort",
  };
  if (includeFunctions) {
    // Ensure that Azure Function Extension does not kill the backend process
    settings["azureFunctions.stopFuncTaskPostDebug"] = false;
    settings["azureFunctions.showProjectWarning"] = false;
    settings["csharp.suppressDotnetRestoreNotification"] = true;
  }
  return settings;
}
