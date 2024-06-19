// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Warning } from "@microsoft/teamsfx-api";
import { globalStateUpdate } from "@microsoft/teamsfx-core";
import { Uri } from "vscode";
import { GlobalKey } from "../constants";
import { checkIsSPFx } from "../globalVariables";
import { isTriggerFromWalkThrough } from "./telemetryUtils";

export async function updateAutoOpenGlobalKey(
  showLocalDebugMessage: boolean,
  projectUri: Uri,
  warnings: Warning[] | undefined,
  args?: any[]
): Promise<void> {
  if (isTriggerFromWalkThrough(args)) {
    await globalStateUpdate(GlobalKey.OpenWalkThrough, true);
    await globalStateUpdate(GlobalKey.OpenReadMe, "");
  } else {
    await globalStateUpdate(GlobalKey.OpenWalkThrough, false);
    await globalStateUpdate(GlobalKey.OpenReadMe, projectUri.fsPath);
  }

  if (showLocalDebugMessage) {
    await globalStateUpdate(GlobalKey.ShowLocalDebugMessage, true);
  }

  if (warnings?.length) {
    await globalStateUpdate(GlobalKey.CreateWarnings, JSON.stringify(warnings));
  }

  if (checkIsSPFx(projectUri.fsPath)) {
    void globalStateUpdate(GlobalKey.AutoInstallDependency, true);
  }
}
