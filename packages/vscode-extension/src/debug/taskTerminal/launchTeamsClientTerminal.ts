// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as cp from "child_process";
import * as vscode from "vscode";
import * as util from "util";
import * as globalVariables from "../../globalVariables";
import { err, FxError, ok, Result, UserError, Void } from "@microsoft/teamsfx-api";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { Correlator } from "@microsoft/teamsfx-core";
import { localTelemetryReporter, maskValue } from "../localTelemetryReporter";
import { getLocalDebugSession } from "../commonUtils";
import VsCodeLogInstance from "../../commonlib/log";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import { SolutionSource } from "@microsoft/teamsfx-core";
import { ExtensionErrors } from "../../error";
import { getDefaultString, localize } from "../../utils/localizeUtils";
import {
  launchingTeamsClientDisplayMessages,
  openTerminalDisplayMessage,
  openTerminalMessage,
} from "../constants";
import { core, getSystemInputs } from "../../handlers";
import { CoreQuestionNames } from "@microsoft/teamsfx-core";
import { HubOptions } from "@microsoft/teamsfx-core";

interface LaunchTeamsClientArgs {
  env?: string;
  manifestPath: string;
}

export class LaunchTeamsClientTerminal extends BaseTaskTerminal {
  private readonly args: LaunchTeamsClientArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as LaunchTeamsClientArgs;
  }

  do(): Promise<Result<Void, FxError>> {
    return Correlator.runWithId(getLocalDebugSession().id, () =>
      localTelemetryReporter.runWithTelemetryProperties(
        TelemetryEvent.LaunchWebClientTask,
        {
          [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
          [TelemetryProperty.DebugTaskArgs]: JSON.stringify({
            env: maskValue(this.args.env),
          }),
        },
        () => this._do()
      )
    );
  }

  private async _do(): Promise<Result<Void, FxError>> {
    if (!this.args?.manifestPath) {
      throw BaseTaskTerminal.taskDefinitionError("manifestPath");
    }

    const inputs = getSystemInputs();
    inputs.env = this.args.env;
    inputs[CoreQuestionNames.M365Host] = HubOptions.teams().id;
    inputs[CoreQuestionNames.TeamsAppManifestFilePath] = this.args.manifestPath;
    inputs[CoreQuestionNames.ConfirmManifest] = "manifest"; // skip confirmation
    const result = await core.previewWithManifest(inputs);
    if (result.isErr()) {
      return err(result.error);
    }
    const launchUrl = result.value;

    VsCodeLogInstance.info(launchingTeamsClientDisplayMessages.title);
    VsCodeLogInstance.outputChannel.appendLine("");
    VsCodeLogInstance.outputChannel.appendLine(
      launchingTeamsClientDisplayMessages.launchUrlMessage(launchUrl)
    );

    if (this.args.env == "local") {
      VsCodeLogInstance.outputChannel.appendLine("");
      VsCodeLogInstance.outputChannel.appendLine(
        launchingTeamsClientDisplayMessages.hotReloadingMessage
      );
    }

    return await this.openUrl(launchUrl);
  }

  private openUrl(url: string): Promise<Result<Void, FxError>> {
    return new Promise<Result<Void, FxError>>((resolve) => {
      const options: cp.SpawnOptions = {
        cwd: globalVariables.workspaceUri?.fsPath ?? "",
        shell: false,
        detached: false,
      };

      const childProc = cp.spawn("npx", ["open-cli", url], options);

      childProc.stdout?.setEncoding("utf-8");
      childProc.stdout?.on("data", (data: string | Buffer) => {
        const line = data.toString().replace(/\n/g, "\r\n");
        this.writeEmitter.fire(line);
      });

      childProc.stderr?.setEncoding("utf-8");
      childProc.stderr?.on("data", (data: string | Buffer) => {
        const line = data.toString().replace(/\n/g, "\r\n");
        this.writeEmitter.fire(line);
      });

      childProc.on("error", (error) => {
        resolve(
          err(
            new UserError(
              SolutionSource,
              ExtensionErrors.LaunchTeamsWebClientError,
              `${getDefaultString("teamstoolkit.localDebug.launchTeamsWebClientError")} ${
                error?.message ?? ""
              }  ${openTerminalDisplayMessage()}`,
              `${localize("teamstoolkit.localDebug.launchTeamsWebClientError")} ${
                error?.message ?? ""
              }  ${openTerminalDisplayMessage()}`
            )
          )
        );
      });

      childProc.on("close", (code: number) => {
        if (code === 0) {
          resolve(ok(Void));
        } else {
          resolve(
            err(
              new UserError(
                SolutionSource,
                ExtensionErrors.LaunchTeamsWebClientError,
                util.format(
                  getDefaultString("teamstoolkit.localDebug.launchTeamsWebClientStoppedError"),
                  code
                ) +
                  " " +
                  openTerminalMessage(),
                util.format(
                  localize("teamstoolkit.localDebug.launchTeamsWebClientStoppedError"),
                  code
                ) +
                  " " +
                  openTerminalDisplayMessage()
              )
            )
          );
        }
      });
    });
  }
}
