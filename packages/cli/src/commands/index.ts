// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { engine } from "./engine";
import { rootCommand } from "./models/root";

export async function start(): Promise<void> {
  await engine.start(rootCommand);
  process.exit(0);
}
