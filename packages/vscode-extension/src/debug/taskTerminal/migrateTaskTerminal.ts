/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";

import { FxError, ok, Result, Void } from "@microsoft/teamsfx-api";
import * as commonUtils from "../commonUtils";
import { BaseTaskTerminal } from "./baseTaskTerminal";

export class MigrateTaskTerminal extends BaseTaskTerminal {
  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
  }

  async do(): Promise<Result<Void, FxError>> {
    await commonUtils.triggerV3Migration();
    return ok(Void);
  }
}
