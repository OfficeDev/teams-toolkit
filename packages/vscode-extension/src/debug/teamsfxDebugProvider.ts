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
import { getSystemInputs, showError } from "../handlers";
import { TelemetryEvent, TelemetryProperty } from "../telemetry/extTelemetryEvents";
import * as commonUtils from "./commonUtils";
import { Host, Hub, sideloadingDisplayMessages } from "./constants";
import { localTelemetryReporter, sendDebugAllEvent } from "./localTelemetryReporter";
import { getTeamsAppInternalId, showInstallAppInTeamsMessage } from "./teamsAppInstallation";
import { terminateAllRunningTeamsfxTasks } from "./teamsfxTaskHandler";
import { core } from "../handlers";

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
  v3Local,
  v3Remote,
  v3M365Local,
  v3M365Remote,
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

      if (!isValidProject(folder.uri.fsPath)) {
        return debugConfiguration;
      }

      // migrate to v3
      if (isV3Enabled() && !isValidProjectV3(folder.uri.fsPath)) {
        await commonUtils.triggerV3Migration();
        return debugConfiguration;
      }

      // Attach correlation-id to DebugConfiguration so concurrent debug sessions are correctly handled in this stage.
      // For backend and bot debug sessions, debugConfiguration.url is undefined so we need to set correlation id early.
      debugConfiguration.teamsfxCorrelationId = commonUtils.getLocalDebugSessionId();

      if (debugConfiguration.url === undefined || debugConfiguration.url === null) {
        return debugConfiguration;
      }
      let url: string = debugConfiguration.url as string;

      let sideloadingType = SideloadingType.unknown;

      const localAppIdPlaceholder = "${localTeamsAppId}";
      if (!isV3Enabled() && url.includes(localAppIdPlaceholder)) {
        sideloadingType = SideloadingType.local;
      }

      const appIdPlaceholder = "${teamsAppId}";
      if (!isV3Enabled() && url.includes(appIdPlaceholder)) {
        sideloadingType = SideloadingType.remote;
      }

      // NOTE: 1. there is no app id in M365 messaging extension launch url
      //       2. there are no launch remote configurations for M365 app
      const localInternalIdPlaceholder = "${localTeamsAppInternalId}";
      const host = new URL(url).host;
      if (
        !isV3Enabled() &&
        (url.includes(localInternalIdPlaceholder) || host === Host.outlook || host === Host.office)
      ) {
        sideloadingType = SideloadingType.m365Local;
      }

      const v3MatchPattern = /\$\{(.+):teamsAppId\}/;
      const v3MatchResult = url.match(v3MatchPattern);
      if (isV3Enabled() && v3MatchResult) {
        sideloadingType =
          v3MatchResult[1] === environmentManager.getLocalEnvName()
            ? SideloadingType.v3Local
            : SideloadingType.v3Remote;
      }

      const v3M365MatchPattern = /\$\{(.+):teamsAppInternalId\}/;
      const v3M365MatchResult = url.match(v3M365MatchPattern);
      if (isV3Enabled() && v3M365MatchResult) {
        sideloadingType = SideloadingType.v3M365Local;
      }

      if (
        sideloadingType === SideloadingType.unknown &&
        (host === Host.outlook || host === Host.office)
      ) {
        sideloadingType =
          typeof debugConfiguration.name === "string" &&
          debugConfiguration.name.startsWith("Launch Remote")
            ? SideloadingType.v3M365Remote
            : SideloadingType.v3M365Local;
      }

      if (sideloadingType === SideloadingType.unknown) {
        return debugConfiguration;
      }

      const isLocal =
        sideloadingType === SideloadingType.local ||
        sideloadingType === SideloadingType.m365Local ||
        sideloadingType === SideloadingType.v3Local ||
        sideloadingType === SideloadingType.v3M365Local;
      telemetryIsRemote = !isLocal;

      const result = await localTelemetryReporter.runWithTelemetryExceptionProperties(
        TelemetryEvent.DebugProviderResolveDebugConfiguration,
        { [TelemetryProperty.DebugRemote]: (!isLocal).toString() },
        async () => {
          if (debugConfiguration.timeout === undefined) {
            debugConfiguration.timeout = 20000;
          }

          let env: string | undefined = undefined;
          let appId: string | undefined = undefined;
          if (
            sideloadingType === SideloadingType.local ||
            sideloadingType === SideloadingType.m365Local ||
            sideloadingType === SideloadingType.remote
          ) {
            let debugConfig = undefined;
            if (isLocal) {
              debugConfig = await commonUtils.getDebugConfig(
                false,
                environmentManager.getLocalEnvName()
              );
            } else {
              debugConfig = await commonUtils.getDebugConfig(isLocal);
            }
            if (!debugConfig) {
              // The user cancels env selection.
              // Returning the value 'undefined' prevents the debug session from starting.
              return undefined;
            }
            env = debugConfig.env!;
            appId = debugConfig.appId;
          } else {
            if (v3MatchResult) {
              env = v3MatchResult[1];
            } else if (v3M365MatchResult) {
              env = v3M365MatchResult[1];
            } else if (host === Host.outlook || host === Host.office) {
              if (sideloadingType === SideloadingType.v3M365Local) {
                env = environmentManager.getLocalEnvName();
              } else if (sideloadingType === SideloadingType.v3M365Remote) {
                const inputs = getSystemInputs();
                inputs.ignoreEnvInfo = false;
                inputs.ignoreLocalEnv = true;
                const envResult = await core.getSelectedEnv(inputs);
                if (envResult.isErr()) {
                  return undefined;
                }
                env = envResult.value;
              }
            }
            appId = await commonUtils.getV3TeamsAppId(folder.uri.fsPath, env!);
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

          switch (sideloadingType) {
            case SideloadingType.local:
              url = url.replace(localAppIdPlaceholder, appId);
              break;
            case SideloadingType.remote:
              url = url.replace(appIdPlaceholder, appId);
              break;
            case SideloadingType.m365Local:
              {
                const internalId = await getTeamsAppInternalId(appId);
                if (internalId !== undefined) {
                  url = url.replace(localInternalIdPlaceholder, internalId);
                }
              }
              break;
            case SideloadingType.v3Local:
            case SideloadingType.v3Remote:
              url = url.replace(v3MatchPattern, appId);
              break;
            case SideloadingType.v3M365Local:
              {
                let internalId = await commonUtils.getV3M365AppId(folder.uri.fsPath, env!);
                internalId = internalId ?? (await getTeamsAppInternalId(appId));
                if (internalId !== undefined) {
                  url = url.replace(v3M365MatchPattern, internalId);
                }
              }
              break;
            case SideloadingType.v3M365Remote:
              {
                let internalId = await commonUtils.getV3M365AppId(folder.uri.fsPath, env!);
                if (internalId === undefined) {
                  const shouldContinue = await showInstallAppInTeamsMessage(env!, appId);
                  if (!shouldContinue) {
                    return undefined;
                  }
                  internalId = await getTeamsAppInternalId(appId);
                }
                if (internalId !== undefined) {
                  url = url.replace(v3M365MatchPattern, internalId);
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
