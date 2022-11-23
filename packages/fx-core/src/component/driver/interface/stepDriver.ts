// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DriverContext } from "./commonArgs";
import { FxError, Result } from "@microsoft/teamsfx-api";

export type ExecutionResult = { result: Result<Map<string, string>, FxError>; summary: string };

export interface StepDriver {
  readonly description?: string;

  /**
   * Run the driver.
   * @param args Arguments from the `with` section in the yaml file.
   * @param context logger, telemetry, progress bar, etc.
   */
  run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>>;

  execute?(args: unknown, ctx: DriverContext): Promise<ExecutionResult>;
}
