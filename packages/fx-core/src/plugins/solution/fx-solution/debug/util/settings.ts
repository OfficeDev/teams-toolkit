// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export function generateSettings(includeBackend: boolean): Record<string, unknown> {
  /**
   * Default settings for extensions
   */
  const settings: Record<string, unknown> = {
    "debug.onTaskErrors": "abort",
  };
  if (includeBackend) {
    // Ensure that Azure Function Extension does not kill the backend process
    settings["azureFunctions.stopFuncTaskPostDebug"] = false;
    settings["azureFunctions.showProjectWarning"] = false;
    settings["csharp.suppressDotnetRestoreNotification"] = true;
  }
  return settings;
}
