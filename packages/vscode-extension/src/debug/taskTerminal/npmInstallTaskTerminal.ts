/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from "path";
import * as vscode from "vscode";

import { FxError, ok, Result, Void } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import VsCodeLogInstance from "../../commonlib/log";
import * as globalVariables from "../../globalVariables";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import * as commonUtils from "../commonUtils";
import {
  localTelemetryReporter,
  maskArrayValue,
  maskValue,
  UndefinedPlaceholder,
} from "../localTelemetryReporter";
import { checkAndInstallNpmPackagesForTask } from "../prerequisitesHandler";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { TaskDefaultValue } from "@microsoft/teamsfx-core/build/common/local";
import { npmInstallDisplayMessages } from "../constants";

export interface NpmInstallArgs {
  projects?: ProjectOptions[];
  forceUpdate?: boolean;
}

interface ProjectOptions {
  cwd?: string;
  npmInstallArgs?: string[];
}

export class NpmInstallTaskTerminal extends BaseTaskTerminal {
  private readonly args: NpmInstallArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as NpmInstallArgs;
  }

  do(): Promise<Result<Void, FxError>> {
    const telemetryProperties = {
      [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
      [TelemetryProperty.DebugTaskArgs]: JSON.stringify({
        forceUpdate: maskValue(this.args.forceUpdate ? "true" : "false", ["false", "true"]),
        projects: !this.args.projects
          ? UndefinedPlaceholder
          : this.args.projects.map((p) => {
              return {
                cwd: maskValue(p.cwd ? path.basename(p.cwd) : p.cwd, [
                  { value: "tabs", mask: "<tab>" },
                  { value: "api", mask: "<api>" },
                  { value: "bot", mask: "<bot>" },
                  { value: "SPFx", mask: "<spfx>" },
                ]),
                npmInstallArgs: maskArrayValue(
                  p.npmInstallArgs,
                  TaskDefaultValue.npmInstall.npmInstallArgs
                ),
              };
            }),
      }),
    };
    return Correlator.runWithId(commonUtils.getLocalDebugSession().id, () =>
      localTelemetryReporter.runWithTelemetryProperties(
        TelemetryEvent.DebugNpmInstallTask,
        telemetryProperties,
        () => this._do(telemetryProperties)
      )
    );
  }

  private async _do(telemetryProperties: {
    [key: string]: string;
  }): Promise<Result<Void, FxError>> {
    if (!this.args?.projects || this.args.projects.length === 0) {
      return ok(Void);
    }

    const npmInstallProjectOptions = this.args.projects.map((projectOption) => {
      if (!projectOption.cwd) {
        throw BaseTaskTerminal.taskDefinitionError("cwd");
      }

      return {
        cwd: path.resolve(
          globalVariables.workspaceUri?.fsPath ?? "",
          BaseTaskTerminal.resolveTeamsFxVariables(projectOption.cwd)
        ),
        args: projectOption.npmInstallArgs,
        forceUpdate: this.args.forceUpdate,
      };
    });

    const res = await checkAndInstallNpmPackagesForTask(
      npmInstallProjectOptions,
      telemetryProperties
    );
    const duration = this.getDurationInSeconds();
    if (res.isOk() && duration) {
      VsCodeLogInstance.info(npmInstallDisplayMessages.durationMessage(duration));
    }
    return res;
  }
}
