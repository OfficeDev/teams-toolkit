// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Service } from "typedi";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { ok } from "@microsoft/teamsfx-api";
import { SyncManifestArgs } from "./interfaces/SyncManifest";

const actionName = "teamsApp/syncManifest";

@Service(actionName)
export class SyncManifestDriver implements StepDriver {
  description?: string | undefined;
  progressTitle?: string | undefined;
  execute(args: SyncManifestArgs, context: DriverContext): Promise<ExecutionResult> {
    console.log("not impletemented yet.");
    return Promise.resolve({
      result: ok(new Map<string, string>()),
      summaries: [],
    });
  }
}
