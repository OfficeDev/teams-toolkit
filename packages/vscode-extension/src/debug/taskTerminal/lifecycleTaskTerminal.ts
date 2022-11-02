/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from "path";
import * as vscode from "vscode";
import { FxError, Inputs, Platform, Result, Void } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import * as globalVariables from "../../globalVariables";
import { core } from "../../handlers";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import * as commonUtils from "../commonUtils";
import { localTelemetryReporter, maskValue } from "../localTelemetryReporter";
import { BaseTaskTerminal } from "./baseTaskTerminal";

export interface LifecycleArgs {
  configFile?: string;
  env?: string;
}

type Lifecycle = typeof LifecycleTaskTerminal.lifecycleList[number];

export class LifecycleTaskTerminal extends BaseTaskTerminal {
  public static readonly lifecycleList = ["provision", "deploy"];
  private readonly args: LifecycleArgs;

  constructor(taskDefinition: vscode.TaskDefinition, private lifecycle: Lifecycle) {
    super(taskDefinition);
    this.args = taskDefinition.args as LifecycleArgs;
  }

  do(): Promise<Result<Void, FxError>> {
    const telemetryProperties = {
      [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
      [TelemetryProperty.DebugTaskArgs]: JSON.stringify({
        configFile: maskValue(this.args.configFile),
        env: maskValue(this.args.env),
      }),
      [TelemetryProperty.DebugLifecycle]: this.lifecycle,
    };

    return Correlator.runWithId(commonUtils.getLocalDebugSession().id, () =>
      localTelemetryReporter.runWithTelemetryProperties(
        TelemetryEvent.DebugLifecycleTask,
        telemetryProperties,
        () => this._do()
      )
    );
  }

  private async _do(): Promise<Result<Void, FxError>> {
    if (!this.args?.configFile) {
      throw BaseTaskTerminal.taskDefinitionError("configFile");
    }

    if (!this.args?.env) {
      throw BaseTaskTerminal.taskDefinitionError("env");
    }

    const resolvedConfigFile = path.resolve(
      globalVariables.workspaceUri?.fsPath ?? "",
      BaseTaskTerminal.resolveTeamsFxVariables(this.args.configFile)
    );
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: globalVariables.workspaceUri?.fsPath,
      correlationId: this.taskTerminalId,
      env: this.args.env,
    };

    const res = await core.apply(inputs, resolvedConfigFile, this.lifecycle);
    return res;
  }
}
