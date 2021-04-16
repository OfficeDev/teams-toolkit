// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { LogProvider } from "./log";
import { TokenProvider } from "./login";
import { TelemetryReporter } from "./telemetry";
import { TreeProvider } from "../ui/tree";
import { UserInterface } from "../ui";

export * from "./login";
export * from "./log";
export * from "./telemetry";
export * from "../ui/tree";

export interface Tools
{
    logProvider: LogProvider;
    tokenProvider: TokenProvider;
    telemetryReporter: TelemetryReporter;
    treeProvider: TreeProvider;
    ui: UserInterface;
}