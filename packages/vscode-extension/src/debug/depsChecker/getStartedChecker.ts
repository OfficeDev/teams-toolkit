// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, err, ok } from "@microsoft/teamsfx-api";
import { ExtTelemetry } from "../../telemetry/extTelemetry";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import { prerequisiteCheckForGetStartedDisplayMessages } from "../common/debugConstants";
import { DepsType } from "@microsoft/teamsfx-core";
import { workspaceUri } from "../../globalVariables";
import { PrerequisiteOrderedChecker } from "../common/types";
import { _checkAndInstall } from "./common";

export async function checkPrerequisitesForGetStarted(): Promise<Result<void, FxError>> {
  const nodeChecker = getOrderedCheckersForGetStarted();
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.GetStartedPrerequisitesStart);
  const res = await _checkAndInstall(prerequisiteCheckForGetStartedDisplayMessages, nodeChecker, {
    [TelemetryProperty.DebugIsTransparentTask]: "false",
  });
  if (res.error) {
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.GetStartedPrerequisites, res.error);
    return err(res.error);
  }
  return ok(undefined);
}

function getOrderedCheckersForGetStarted(): PrerequisiteOrderedChecker[] {
  const workspacePath = workspaceUri?.fsPath;
  return [
    {
      info: { checker: workspacePath ? DepsType.ProjectNode : DepsType.LtsNode },
      fastFail: false,
    },
  ];
}
