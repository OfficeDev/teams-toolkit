// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, ok } from "@microsoft/teamsfx-api";
import { PanelType } from "../controls/PanelType";
import { WebviewPanel } from "../controls/webviewPanel";
import { VS_CODE_UI } from "../qm/vsc_ui";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../telemetry/extTelemetryEvents";
import { localize } from "../utils/localizeUtils";

export function checkSideloadingCallback(args?: any[]): Promise<Result<null, FxError>> {
  VS_CODE_UI.showMessage(
    "error",
    localize("teamstoolkit.accountTree.sideloadingMessage"),
    false,
    localize("teamstoolkit.accountTree.sideloadingLearnMore")
  )
    .then((result) => {
      if (
        result.isOk() &&
        result.value === localize("teamstoolkit.accountTree.sideloadingLearnMore")
      ) {
        WebviewPanel.createOrShow(PanelType.AccountHelp);
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenSideloadingLearnMore);
      }
    })
    .catch((_error) => {});
  WebviewPanel.createOrShow(PanelType.AccountHelp);
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.InteractWithInProductDoc, {
    [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.SideloadingDisabled,
  });
  return Promise.resolve(ok(null));
}
