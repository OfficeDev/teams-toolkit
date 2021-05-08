// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export function generateSettings(): Record<string, unknown> {
    /**
     * Default settings for extensions
     */
    return {
        // Ensure that Azure Function Extension does not kill the backend process
        "azureFunctions.stopFuncTaskPostDebug": false,
        "azureFunctions.showProjectWarning": false,
        "csharp.suppressDotnetRestoreNotification": true
    };
}