// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { fillinProjectTypeProperties } from "@microsoft/teamsfx-core";
import { workspaceUri } from "../globalVariables";
import { core } from "../handlers";
import { ExtTelemetry } from "../telemetry/extTelemetry";

export async function checkProjectTypeAndSendTelemetry(): Promise<void> {
  if (!workspaceUri?.fsPath) return;
  const res = await core.checkProjectType(workspaceUri?.fsPath);
  if (res.isErr()) return;
  const result = res.value;
  const props: Record<string, string> = {};
  fillinProjectTypeProperties(props, result);
  for (const key of Object.keys(props)) {
    ExtTelemetry.addSharedProperty(key, props[key]);
  }
}
