// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import {
  isValidProject,
  isValidProjectV3,
} from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";
import { AppStudioScopes, isV3Enabled } from "@microsoft/teamsfx-core/build/common/tools";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";

import VsCodeLogInstance from "../commonlib/log";
import M365TokenInstance from "../commonlib/m365Login";
import { getSystemInputs, showError, core } from "../handlers";
import { TelemetryEvent, TelemetryProperty } from "../telemetry/extTelemetryEvents";
import * as commonUtils from "./commonUtils";
import { Host, Hub, sideloadingDisplayMessages } from "./constants";
import { localTelemetryReporter, sendDebugAllEvent } from "./localTelemetryReporter";
import { getTeamsAppInternalId, showInstallAppInTeamsMessage } from "./teamsAppInstallation";
import { terminateAllRunningTeamsfxTasks } from "./teamsfxTaskHandler";

export interface TeamsfxDebugConfiguration extends vscode.DebugConfiguration {
  teamsfxIsRemote?: boolean;
  teamsfxEnv?: string;
  teamsfxAppId?: string;
  teamsfxCorrelationId?: string;
  teamsfxHub?: Hub;
}

enum SideloadingType {
  unknown,
  local,
  remote,
  m365Local,
  m365Remote,
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

      if (debugConfiguration.url === undefined || debugConfiguration.url === null) {
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

      // resolve hub, sideloading type, env
      let url: string = debugConfiguration.url as string;
      const host = new URL(url).host;
      let sideloadingType = SideloadingType.unknown;
      let env: string | undefined = undefined;

      // match ${xxx:teamsAppId}
      let matchResult = url.match(/\$\{(.+?):teamsAppId\}/);
      if (matchResult) {
        env = matchResult[1];
        sideloadingType =
          env === environmentManager.getLocalEnvName()
            ? SideloadingType.local
            : SideloadingType.remote;
      }

      if (sideloadingType === SideloadingType.unknown) {
        // match ${xxx:teamsAppInternalId}
        matchResult = url.match(/\$\{(.+?):teamsAppInternalId\}/);
        if (matchResult) {
          env = matchResult[1];
          sideloadingType =
            env === environmentManager.getLocalEnvName()
              ? SideloadingType.m365Local
              : SideloadingType.m365Remote;
        }
      }

      if (sideloadingType === SideloadingType.unknown) {
        // match ${teamsAppId}
        matchResult = url.match(/\$\{teamsAppId\}/);
        if (matchResult) {
          sideloadingType = SideloadingType.remote;
        }
      }

      if (sideloadingType === SideloadingType.unknown) {
        // match ${teamsAppInternalId}
        matchResult = url.match(/\$\{teamsAppInternalId\}/);
        if (matchResult) {
          sideloadingType = SideloadingType.m365Remote;
        }
      }

      if (sideloadingType === SideloadingType.unknown) {
        // handle url without placeholder
        if (host === Host.outlook || host === Host.office) {
          if (typeof debugConfiguration.name === "string") {
            sideloadingType = debugConfiguration.name.startsWith("Launch Remote")
              ? SideloadingType.m365Remote
              : SideloadingType.m365Local;
            if (sideloadingType === SideloadingType.m365Local) {
              env = environmentManager.getLocalEnvName();
            }
          }
        }
      }

      if (sideloadingType === SideloadingType.unknown) {
        return debugConfiguration;
      }

      const isLocal =
        sideloadingType === SideloadingType.local || sideloadingType === SideloadingType.m365Local;
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

          if (env === undefined) {
            const inputs = getSystemInputs();
            inputs.ignoreEnvInfo = false;
            inputs.ignoreLocalEnv = true;
            const envResult = await core.getSelectedEnv(inputs);
            if (envResult.isErr()) {
              throw envResult.error;
            }
            env = envResult.value;
          }
          const appId = await commonUtils.getV3TeamsAppId(folder.uri.fsPath, env!);

          switch (sideloadingType) {
            case SideloadingType.local:
            case SideloadingType.remote:
              if (matchResult) {
                url = url.replace(matchResult[0], appId);
              }
              break;
            case SideloadingType.m365Local:
            case SideloadingType.m365Remote:
              if (matchResult) {
                let internalId = await commonUtils.getV3M365AppId(folder.uri.fsPath, env!);
                internalId = internalId ?? (await getTeamsAppInternalId(appId));
                if (internalId === undefined) {
                  throw new UserError(
                    ExtensionSource,
                    "AppNotUploadedToM365Error",
                    "Your app package has not been uploaded to M365. Please use m365Title/acquire action to do that. See https://aka.ms/teamsfx-actions/m365-title-acquire for details."
                  );
                }
                if (internalId !== undefined) {
                  url = url.replace(matchResult[0], internalId);
                }
              }
              break;
          }

          const accountHintPlaceholder = "${account-hint}";
          const isaccountHintConfiguration: boolean = url.includes(accountHintPlaceholder);
          if (isaccountHintConfiguration) {
            const accountHint = await generateAccountHint(host === Host.teams);
            url = url.replace(accountHintPlaceholder, accountHint);
          }

          // Put env and appId in `debugConfiguration` so debug handlers can retrieve it and send telemetry
          debugConfiguration.teamsfxIsRemote = !isLocal;
          debugConfiguration.teamsfxEnv = env;
          debugConfiguration.teamsfxAppId = appId;
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
        tenantId = await commonUtils.getTeamsAppTenantId();
        loginHint = "login_your_m365_account"; // a workaround that user has the chance to login
      }
    } catch {
      // ignore error
    }
  }
  if (includeTenantId) {
    return tenantId && loginHint ? `appTenantId=${tenantId}&login_hint=${loginHint}` : "";
  } else {
    return loginHint ? `login_hint=${loginHint}` : "";
  }
}
