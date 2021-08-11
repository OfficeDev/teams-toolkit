// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { UserInteraction } from "../qm/ui";
import { CryptoProvider } from "./crypto";
import { LogProvider } from "./log";
import { TokenProvider } from "./login";
import { TelemetryReporter } from "./telemetry";
import { TreeProvider } from "./tree";

export * from "./login";
export * from "./log";
export * from "./telemetry";
export * from "./tree";
export * from "./crypto";

export interface Tools {
  logProvider: LogProvider;
  tokenProvider: TokenProvider;
  telemetryReporter?: TelemetryReporter;
  treeProvider?: TreeProvider;
  ui: UserInteraction;
  cryptoProvider?: CryptoProvider;
}
