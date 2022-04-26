// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { isAadManifestEnabled } from "../../../../../common";

export function generateSettings(
  includeFunctions: boolean,
  isSpfx: boolean
): Record<string, unknown> {
  /**
   * Default settings for extensions
   */
  const settings: Record<string, unknown> = {
    "debug.onTaskErrors": "abort",
  };

  if (!isSpfx && isAadManifestEnabled()) {
    settings["json.schemas"] = [
      {
        fileMatch: ["/aad.*.json"],
        schema: {},
      },
    ];
  }

  if (includeFunctions) {
    // Ensure that Azure Function Extension does not kill the backend process
    settings["azureFunctions.stopFuncTaskPostDebug"] = false;
    settings["azureFunctions.showProjectWarning"] = false;
    settings["csharp.suppressDotnetRestoreNotification"] = true;
  }
  return settings;
}
