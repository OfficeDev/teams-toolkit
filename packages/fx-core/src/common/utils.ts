// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { DriverContext } from "../component/driver/interface/commonArgs";

export async function waitSeconds(second: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, second * 1000));
}

export function generateDriverContext(ctx: Context, inputs: InputsWithProjectPath): DriverContext {
  return {
    azureAccountProvider: ctx.tokenProvider!.azureAccountProvider,
    m365TokenProvider: ctx.tokenProvider!.m365TokenProvider,
    ui: ctx.userInteraction,
    progressBar: undefined,
    logProvider: ctx.logProvider,
    telemetryReporter: ctx.telemetryReporter,
    projectPath: ctx.projectPath!,
    platform: inputs.platform,
  };
}
