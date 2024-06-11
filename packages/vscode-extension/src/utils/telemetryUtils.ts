// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { workspaceUri, core } from "../globalVariables";

export function getPackageVersion(versionStr: string): string {
  if (versionStr.includes("alpha")) {
    return "alpha";
  }

  if (versionStr.includes("beta")) {
    return "beta";
  }

  if (versionStr.includes("rc")) {
    return "rc";
  }

  return "formal";
}

export async function getProjectId(): Promise<string | undefined> {
  if (!workspaceUri) {
    return undefined;
  }
  try {
    const ws = workspaceUri.fsPath;
    const projInfoRes = await core.getProjectId(ws);
    if (projInfoRes.isOk()) {
      return projInfoRes.value;
    }
  } catch (e) {}
  return undefined;
}
