// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { FxError, ok, Result, Void } from "@microsoft/teamsfx-api";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { triggerV3Migration } from "../../utils/migrationUtils";

export class MigrateTaskTerminal extends BaseTaskTerminal {
  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
  }

  async do(): Promise<Result<Void, FxError>> {
    await triggerV3Migration();
    return ok(Void);
  }
}
