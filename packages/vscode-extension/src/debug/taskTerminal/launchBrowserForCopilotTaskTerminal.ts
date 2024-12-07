// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { FxError, ok, Result, Void } from "@microsoft/teamsfx-api";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { launchBrowser } from "../../pluginDebug/browser-launcher"

interface LaunchBrowserForCopilotArgs {
    url: string;
}

export class LaunchBrowserForCopilot extends BaseTaskTerminal {
  private readonly args: LaunchBrowserForCopilotArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as LaunchBrowserForCopilotArgs;
  }

  async do(): Promise<Result<Void, FxError>> {
    await launchBrowser(this.args.url);
    return ok(Void);
  }
}