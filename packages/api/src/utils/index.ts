// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Dialog } from "./dialog";
import { LogProvider } from "./log";
import { TokenProvider } from "./login";
import { TelemetryReporter } from "./telemetry";
import { TreeProvider } from "./tree";

export * from "./login";
export * from "./log";
export * from "./telemetry";
export * from "./dialog";
export * from "./tree";

export interface ToolsProvider
{
    logProvider: LogProvider;
    tokenProvider: TokenProvider;
    telemetryReporter: TelemetryReporter;
    treeProvider: TreeProvider;
    dialog: Dialog;
}