// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LocalEnvManager } from "@microsoft/teamsfx-core";
import VsCodeLogInstance from "../commonlib/log";
import { workspaceUri } from "../globalVariables";
import { ExtTelemetry } from "../telemetry/extTelemetry";

export async function getNpmInstallLogInfo(): Promise<any> {
  const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
  return await localEnvManager.getNpmInstallLogInfo();
}

export async function getTestToolLogInfo(): Promise<string | undefined> {
  const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
  if (!workspaceUri?.fsPath) {
    return undefined;
  }
  return await localEnvManager.getTestToolLogInfo(workspaceUri?.fsPath);
}
