/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cp from "child_process";
import * as vscode from "vscode";
import * as util from "util";
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
import { envUtil } from "@microsoft/teamsfx-core/build/component/utils/envUtil";
import { manifestUtils } from "@microsoft/teamsfx-core/build/component/resource/appManifest/utils/ManifestUtils";
import { core, getSystemInputs } from "../../handlers";

export interface LaunchTeamsClientArgs {
  env: string;
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
    if (!this.args?.env) {
      // Prompt to select env
      const inputs = getSystemInputs();
      inputs.ignoreEnvInfo = false;
      inputs.ignoreLocalEnv = true;
      const envResult = await core.getSelectedEnv(inputs);
      if (envResult.isErr()) {
        throw envResult.error;
      }
      this.args.env = envResult.value!;

      // reload env
      const envRes = await envUtil.readEnv(
        globalVariables.workspaceUri?.fsPath as string,
        this.args.env,
        false,
        true
      );
      if (envRes.isErr()) {
        throw envRes.error;
      }
    }

    if (!this.args?.manifestPath) {
      throw BaseTaskTerminal.taskDefinitionError("manifestPath");
    }

    const teamsAppId = await this.getTeamsAppId(this.args.env, this.args.manifestPath);
    const accountHint = await generateAccountHint(false);
    const launchUrl = `https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&webjoin=true&${accountHint}`;

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

  private async getTeamsAppId(env: string, manifestPath: string): Promise<string> {
    // load env from .env
    const projectPath = globalVariables.workspaceUri?.fsPath as string;
    const envRes = await envUtil.readEnv(projectPath, env, true, true);
    if (envRes.isErr()) {
      throw envRes.error;
    }

    // read manifest
    const manifestRes = await manifestUtils.getManifestV3(manifestPath, {});
    if (manifestRes.isErr()) {
      throw manifestRes.error;
    }

    return manifestRes.value.id;
  }

  private openUrl(url: string): Promise<Result<Void, FxError>> {
    return new Promise<Result<Void, FxError>>(async (resolve, reject) => {
      const options: cp.SpawnOptions = {
        cwd: globalVariables.workspaceUri?.fsPath ?? "",
        shell: true,
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
