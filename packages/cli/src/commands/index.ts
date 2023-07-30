// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { initTelemetryReporter, sendCommandUsageTelemetry } from "..";
import { registerPrompts } from "../prompts";
import { engine } from "./engine";
import { rootCommand } from "./models/root";

export async function start(): Promise<void> {
  initTelemetryReporter();
  sendCommandUsageTelemetry(process.argv);
  registerPrompts();
  await engine.start(rootCommand);
  process.exit(0);
}

start();
