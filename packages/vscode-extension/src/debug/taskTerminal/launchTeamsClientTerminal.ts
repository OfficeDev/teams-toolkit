/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from "vscode";
import * as util from "util";
import * as open from "open";
import * as commonUtils from "../commonUtils";
import * as globalVariables from "../../globalVariables";
import { err, FxError, ok, Result, UserError, Void } from "@microsoft/teamsfx-api";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import { localTelemetryReporter, maskValue } from "../localTelemetryReporter";
import { getLocalDebugSession } from "../commonUtils";
import VsCodeLogInstance from "../../commonlib/log";
import { generateAccountHint } from "../teamsfxDebugProvider";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import { SolutionSource } from "@microsoft/teamsfx-core/build/component/constants";
import { ExtensionErrors } from "../../error";
import { getDefaultString, localize } from "../../utils/localizeUtils";
import {
  launchingTeamsClientDisplayMessages,
  openTerminalDisplayMessage,
  openTerminalMessage,
} from "../constants";

export interface LaunchTeamsClientArgs {
  env: string;
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
    if (!this.args?.env) {
      throw BaseTaskTerminal.taskDefinitionError("env");
    }

    const teamsAppId = await commonUtils.getV3TeamsAppId(
      globalVariables.workspaceUri?.fsPath as string,
      this.args.env
    );
    const accountHint = await generateAccountHint(false);
    const launchUrl =
      `https://teams.microsoft.com/l/app/${teamsAppId}?` +
      encodeURIComponent(`installAppPackage=true&webjoin=true&${accountHint}`);

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
    return new Promise<Result<Void, FxError>>(async (resolve, reject) => {
      const childProc = await open(url);

      childProc.stdout?.setEncoding("utf-8");
      childProc.stdout?.on("data", (data: string | Buffer) => {
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
