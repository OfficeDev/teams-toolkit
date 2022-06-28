// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppStudioScopes,
  Correlator,
  environmentManager,
  isConfigUnifyEnabled,
} from "@microsoft/teamsfx-core";
import * as vscode from "vscode";

import M365TokenInstance from "../commonlib/m365Login";
import { getTeamsAppInternalId } from "./teamsAppInstallation";
import * as commonUtils from "./commonUtils";
import { showError } from "../handlers";
import { terminateAllRunningTeamsfxTasks } from "./teamsfxTaskHandler";
import { Host, Hub } from "./constants";
import { localTelemetryReporter, sendDebugAllEvent } from "./localTelemetryReporter";
import { TelemetryEvent, TelemetryProperty } from "../telemetry/extTelemetryEvents";

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
      if (!(await commonUtils.isFxProject(folder.uri.fsPath))) {
        return debugConfiguration;
      }

      // Attach correlation-id to DebugConfiguration so concurrent debug sessions are correctly handled in this stage.
      // For backend and bot debug sessions, debugConfiguration.url is undefined so we need to set correlation id early.
      debugConfiguration.teamsfxCorrelationId = commonUtils.getLocalDebugSessionId();

      if (debugConfiguration.url === undefined) {
        return debugConfiguration;
      }
      let url: string = debugConfiguration.url as string;

      const localTeamsAppIdPlaceholder = "${localTeamsAppId}";
      const isLocalSideloadingConfiguration: boolean = url.includes(localTeamsAppIdPlaceholder);
      const teamsAppIdPlaceholder = "${teamsAppId}";
      const isSideloadingConfiguration: boolean = url.includes(teamsAppIdPlaceholder);
      const localTeamsAppInternalIdPlaceholder = "${localTeamsAppInternalId}";
      // NOTE: 1. there is no app id in M365 messaging extension launch url
      //       2. there are no launch remote configurations for M365 app
      const host = new URL(url).host;
      const isLocalM365SideloadingConfiguration: boolean =
        url.includes(localTeamsAppInternalIdPlaceholder) ||
        host === Host.outlook ||
        host === Host.office;
      const isLocalSideloading =
        isLocalSideloadingConfiguration || isLocalM365SideloadingConfiguration;
      telemetryIsRemote = !isLocalSideloading;

      if (
        !isLocalSideloadingConfiguration &&
        !isSideloadingConfiguration &&
        !isLocalM365SideloadingConfiguration
      ) {
        return debugConfiguration;
      }

      await localTelemetryReporter.runWithTelemetryExceptionProperties(
        TelemetryEvent.DebugProviderResolveDebugConfiguration,
        { [TelemetryProperty.DebugRemote]: (!isSideloadingConfiguration).toString() },
        async () => {
          if (debugConfiguration.timeout === undefined) {
            debugConfiguration.timeout = 20000;
          }

          let debugConfig = undefined;
          if (isLocalSideloading && isConfigUnifyEnabled()) {
            debugConfig = await commonUtils.getDebugConfig(
              false,
              environmentManager.getLocalEnvName()
            );
          } else {
            debugConfig = await commonUtils.getDebugConfig(isLocalSideloading);
          }
          if (!debugConfig) {
            // The user cancels env selection.
            // Returning the value 'undefined' prevents the debug session from starting.
            return undefined;
          }

          // Put env and appId in `debugConfiguration` so debug handlers can retrieve it and send telemetry
          debugConfiguration.teamsfxIsRemote = isSideloadingConfiguration;
          debugConfiguration.teamsfxEnv = debugConfig.env;
          debugConfiguration.teamsfxAppId = debugConfig.appId;
          if (host === Host.teams) {
            debugConfiguration.teamsfxHub = Hub.teams;
          } else if (host === Host.outlook) {
            debugConfiguration.teamsfxHub = Hub.outlook;
          } else if (host === Host.office) {
            debugConfiguration.teamsfxHub = Hub.office;
          }

          url = url.replace(localTeamsAppIdPlaceholder, debugConfig.appId);
          url = url.replace(teamsAppIdPlaceholder, debugConfig.appId);
          if (isLocalM365SideloadingConfiguration) {
            const internalId = await getTeamsAppInternalId(debugConfig.appId);
            if (internalId !== undefined) {
              url = url.replace(localTeamsAppInternalIdPlaceholder, internalId);
            }
          }

          const accountHintPlaceholder = "${account-hint}";
          const isaccountHintConfiguration: boolean = url.includes(accountHintPlaceholder);
          if (isaccountHintConfiguration) {
            const accountHint = await generateAccountHint(
              isLocalSideloadingConfiguration || isSideloadingConfiguration
            );
            url = url.replace(accountHintPlaceholder, accountHint);
          }

          debugConfiguration.url = url;
        }
      );
    } catch (error: any) {
      showError(error);
      terminateAllRunningTeamsfxTasks();
      await vscode.debug.stopDebugging();
      await sendDebugAllEvent(telemetryIsRemote, error);
      commonUtils.endLocalDebugSession();
    }
    return debugConfiguration;
  }
}

export async function generateAccountHint(includeTenantId = true): Promise<string> {
  let tenantId = undefined,
    loginHint = undefined;
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
  if (includeTenantId) {
    return tenantId && loginHint ? `appTenantId=${tenantId}&login_hint=${loginHint}` : "";
  } else {
    return loginHint ? `login_hint=${loginHint}` : "";
  }
}
