// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as handlerBase from "../handlers";
import * as commonUtils from "../utils/commonUtils";

import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";

import { CreateProjectResult, FxError, Result, Stage } from "@microsoft/teamsfx-api";

export async function createProjectFromWalkthroughHandler(
  args?: any[]
): Promise<Result<CreateProjectResult, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CreateProjectStart,
    commonUtils.getTriggerFromProperty(args)
  );

  // parse questions model answers to inputs
  const inputs = handlerBase.getSystemInputs();
  if (args && args.length >= 2 && args[1]) {
    Object.keys(args[1]).forEach((k) => {
      inputs[k] = args[1][k];
    });
  }

  const result = await handlerBase.runCommand(Stage.create, inputs);
  return result;
}
