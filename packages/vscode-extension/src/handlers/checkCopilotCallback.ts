// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, ok } from "@microsoft/teamsfx-api";
import { VS_CODE_UI } from "../qm/vsc_ui";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import { localize } from "../utils/localizeUtils";

export async function checkCopilotCallback(args?: any[]): Promise<Result<null, FxError>> {
  VS_CODE_UI.showMessage(
    "warn",
    localize("teamstoolkit.accountTree.copilotMessage"),
    false,
    localize("teamstoolkit.accountTree.copilotEnroll")
  )
    .then(async (result) => {
      if (result.isOk() && result.value === localize("teamstoolkit.accountTree.copilotEnroll")) {
        await VS_CODE_UI.openUrl("https://aka.ms/PluginsEarlyAccess");
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenCopilotEnroll);
      }
    })
    .catch((_error) => {});
  return Promise.resolve(ok(null));
}
