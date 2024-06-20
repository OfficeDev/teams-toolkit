// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, Result, UserError, Void } from "@microsoft/teamsfx-api";
import {
  QuestionNames,
  Correlator,
  environmentNameManager,
  HubOptions,
} from "@microsoft/teamsfx-core";
import * as cp from "child_process";
import * as util from "util";
import * as vscode from "vscode";
import VsCodeLogInstance from "../../commonlib/log";
import { ExtensionErrors, ExtensionSource } from "../../error/error";
import { core, workspaceUri } from "../../globalVariables";
import { getSystemInputs } from "../../utils/systemEnvUtils";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import { getDefaultString, localize } from "../../utils/localizeUtils";
import { getLocalDebugSession } from "../common/localDebugSession";
import {
  launchingTeamsClientDisplayMessages,
  openTerminalDisplayMessage,
  openTerminalMessage,
} from "../common/debugConstants";
import { localTelemetryReporter, maskValue } from "../localTelemetryReporter";
import { BaseTaskTerminal } from "./baseTaskTerminal";

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
    inputs[QuestionNames.M365Host] = HubOptions.teams().id;
    inputs[QuestionNames.TeamsAppManifestFilePath] = this.args.manifestPath;
    inputs[QuestionNames.ConfirmManifest] = "manifest"; // skip confirmation
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

    if (this.args.env && !environmentNameManager.isRemoteEnvironment(this.args.env)) {
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
        cwd: workspaceUri?.fsPath ?? "",
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
              ExtensionSource,
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
                ExtensionSource,
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
