// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    /**
     * Contain the most detailed messages.
     */
    LogLevel[LogLevel["Trace"] = 0] = "Trace";
    /**
     * For debugging and development.
     */
    LogLevel[LogLevel["Debug"] = 1] = "Debug";
    /**
     * Tracks the general flow of the app. May have long-term value.
     */
    LogLevel[LogLevel["Info"] = 2] = "Info";
    /**
     * For abnormal or unexpected events. Typically includes errors or conditions that don't cause the app to fail.
     */
    LogLevel[LogLevel["Warning"] = 3] = "Warning";
    /**
     * For errors and exceptions that cannot be handled. These messages indicate a failure in the current operation or request, not an app-wide failure.
     */
    LogLevel[LogLevel["Error"] = 4] = "Error";
    /**
     * For failures that require immediate attention. Examples: data loss scenarios.
     */
    LogLevel[LogLevel["Fatal"] = 5] = "Fatal";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
//# sourceMappingURL=log.js.map