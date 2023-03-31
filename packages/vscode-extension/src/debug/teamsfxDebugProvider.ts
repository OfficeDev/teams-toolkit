// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";

import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import {
  isValidProject,
  isValidProjectV3,
} from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";
import { AppStudioScopes, isV3Enabled } from "@microsoft/teamsfx-core/build/common/tools";
import { envUtil } from "@microsoft/teamsfx-core/build/component/utils/envUtil";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { UnresolvedPlaceholderError } from "@microsoft/teamsfx-core/build/error/common";

import VsCodeLogInstance from "../commonlib/log";
import M365TokenInstance from "../commonlib/m365Login";
import { ExtensionSource } from "../error";
import { core, getSystemInputs, showError } from "../handlers";
import { TelemetryEvent, TelemetryProperty } from "../telemetry/extTelemetryEvents";
import * as commonUtils from "./commonUtils";
import { accountHintPlaceholder, Host, Hub, sideloadingDisplayMessages } from "./constants";
import { localTelemetryReporter, sendDebugAllEvent } from "./localTelemetryReporter";
import { terminateAllRunningTeamsfxTasks } from "./teamsfxTaskHandler";

export interface TeamsfxDebugConfiguration extends vscode.DebugConfiguration {
  teamsfxIsRemote?: boolean;
  teamsfxEnv?: string;
  teamsfxAppId?: string;
  teamsfxCorrelationId?: string;
  teamsfxHub?: Hub;
}

export class TeamsfxDebugProvider implements vscode.DebugConfigurationProvider {
  public async resolveDebugConfiguration?(
    folder: vscode.WorkspaceFolder | undefined,
    debugConfiguration: TeamsfxDebugConfiguration,
    token?: vscode.CancellationToken
  ): Promise<vscode.DebugConfiguration | undefined> {
    return Correlator.runWithId(
      commonUtils.getLocalDebugSessionId(),
      this._resolveDebugConfiguration,
      folder,
      debugConfiguration,
      token
    );
  }

  private async _resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    debugConfiguration: TeamsfxDebugConfiguration,
    token?: vscode.CancellationToken
  ): Promise<vscode.DebugConfiguration | undefined> {
    let telemetryIsRemote: boolean | undefined = undefined;
    try {
      if (!folder) {
        return debugConfiguration;
      }

      if (typeof debugConfiguration.url !== "string") {
        return debugConfiguration;
      }

      if (!isV3Enabled()) {
        return debugConfiguration;
      }

      if (!isValidProject(folder.uri.fsPath)) {
        return debugConfiguration;
      }

      // migrate to v3
      if (!isValidProjectV3(folder.uri.fsPath)) {
        await commonUtils.triggerV3Migration();
        return debugConfiguration;
      }

      // resolve env
      let url: string = debugConfiguration.url;
      const host = new URL(url).host;
      let env: string | undefined = undefined;

      // match ${{xxx:yyy}}
      let matchResult = url.match(/\${{(.+):([A-Za-z0-9_]+)}}/);
      if (matchResult) {
        env = matchResult[1];
      }

      if (!env) {
        // match ${{yyy}}
        matchResult = url.match(/\${{([A-Za-z0-9_]+)}}/);
        if (matchResult) {
          // prompt to select env
          const inputs = getSystemInputs();
          inputs.ignoreEnvInfo = false;
          inputs.ignoreLocalEnv = true;
          const envResult = await core.getSelectedEnv(inputs);
          if (envResult.isErr()) {
            throw envResult.error;
          }
          env = envResult.value;
        }
      }

      const isLocal =
        env === environmentManager.getLocalEnvName() ||
        !debugConfiguration.name.startsWith("Launch Remote");
      telemetryIsRemote = !isLocal;

      // Attach correlation-id to DebugConfiguration so concurrent debug sessions are correctly handled in this stage.
      // For backend and bot debug sessions, debugConfiguration.url is undefined so we need to set correlation id early.
      debugConfiguration.teamsfxCorrelationId = commonUtils.getLocalDebugSessionId();

      const result = await localTelemetryReporter.runWithTelemetryExceptionProperties(
        TelemetryEvent.DebugProviderResolveDebugConfiguration,
        { [TelemetryProperty.DebugRemote]: (!isLocal).toString() },
        async () => {
          if (debugConfiguration.timeout === undefined) {
            debugConfiguration.timeout = 20000;
          }

          if (env && matchResult) {
            // replace environment variable
            const envRes = await envUtil.readEnv(folder.uri.fsPath, env, false, true);
            if (envRes.isErr()) {
              throw envRes.error;
            }
            const key = matchResult[matchResult.length - 1];
            if (!envRes.value[key]) {
              throw new UnresolvedPlaceholderError(
                ExtensionSource,
                key,
                path.normalize(path.join(folder.uri.fsPath, ".vscode", "launch.json")),
                "https://aka.ms/teamsfx-tasks"
              );
            }
            url = url.replace(matchResult[0], envRes.value[key]);
          }

          // replace ${account-hint}
          if (url.includes(accountHintPlaceholder)) {
            url = url.replace(
              accountHintPlaceholder,
              await generateAccountHint(host === Host.teams)
            );
          }

          // Put env and appId in `debugConfiguration` so debug handlers can retrieve it and send telemetry
          debugConfiguration.teamsfxIsRemote = !isLocal;
          debugConfiguration.teamsfxEnv = env;
          if (host === Host.teams) {
            debugConfiguration.teamsfxHub = Hub.teams;
          } else if (host === Host.outlook) {
            debugConfiguration.teamsfxHub = Hub.outlook;
          } else if (host === Host.office) {
            debugConfiguration.teamsfxHub = Hub.office;
          }

          return url;
        }
      );

      if (result === undefined) {
        return undefined;
      }
      debugConfiguration.url = result;

      VsCodeLogInstance.info(sideloadingDisplayMessages.title(debugConfiguration.teamsfxHub!));
      VsCodeLogInstance.outputChannel.appendLine("");
      VsCodeLogInstance.outputChannel.appendLine(
        sideloadingDisplayMessages.sideloadingUrlMessage(
          debugConfiguration.teamsfxHub!,
          debugConfiguration.url
        )
      );
      if (isLocal) {
        VsCodeLogInstance.outputChannel.appendLine("");
        VsCodeLogInstance.outputChannel.appendLine(sideloadingDisplayMessages.hotReloadingMessage);
      }
    } catch (error: any) {
      showError(error);
      terminateAllRunningTeamsfxTasks();
      await vscode.debug.stopDebugging();
      // not for undefined
      if (telemetryIsRemote === false) {
        await sendDebugAllEvent(error);
      }
      commonUtils.endLocalDebugSession();
    }
    return debugConfiguration;
  }
}

export async function generateAccountHint(includeTenantId = true): Promise<string> {
  let tenantId = undefined,
    loginHint = undefined;
  const accountInfo = M365TokenInstance.getCachedAccountInfo();
  if (accountInfo !== undefined) {
    tenantId = accountInfo.tenantId;
    loginHint = accountInfo.username;
  } else {
    try {
      const tokenObjectRes = await M365TokenInstance.getStatus({ scopes: AppStudioScopes });
      const tokenObject = tokenObjectRes.isOk() ? tokenObjectRes.value.accountInfo : undefined;
      if (tokenObject) {
        // user signed in
        tenantId = tokenObject.tid;
        loginHint = tokenObject.upn;
      } else {
        // no signed user
        loginHint = "login_your_m365_account"; // a workaround that user has the chance to login
      }
    } catch {
      // ignore error
    }
  }
  if (includeTenantId && tenantId) {
    return loginHint ? `appTenantId=${tenantId}&login_hint=${loginHint}` : "";
  } else {
    return loginHint ? `login_hint=${loginHint}` : "";
  }
}
