// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Correlator, environmentManager, isConfigUnifyEnabled } from "@microsoft/teamsfx-core";
import * as vscode from "vscode";

import AppStudioTokenInstance from "../commonlib/appStudioLogin";
import { getTeamsAppInternalId } from "./teamsAppInstallation";
import * as commonUtils from "./commonUtils";
import { showError } from "../handlers";
import { terminateAllRunningTeamsfxTasks } from "./teamsfxTaskHandler";

export interface TeamsfxDebugConfiguration extends vscode.DebugConfiguration {
  teamsfxEnv?: string;
  teamsfxAppId?: string;
  teamsfxCorrelationId?: string;
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
    try {
      if (folder) {
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
        const isLocalM365SideloadingConfiguration: boolean = url.includes(
          localTeamsAppInternalIdPlaceholder
        );
        const teamsAppInternalIdPlaceholder = "${teamsAppInternalId}";
        const isM365SideloadingConfiguration: boolean = url.includes(teamsAppInternalIdPlaceholder);
        const isLocalSideloading: boolean =
          isLocalSideloadingConfiguration || isLocalM365SideloadingConfiguration;

        if (
          !isLocalSideloadingConfiguration &&
          !isSideloadingConfiguration &&
          !isLocalM365SideloadingConfiguration &&
          !isM365SideloadingConfiguration
        ) {
          return debugConfiguration;
        }

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
        debugConfiguration.teamsfxEnv = debugConfig.env;
        debugConfiguration.teamsfxAppId = debugConfig.appId;

        url = url.replace(localTeamsAppIdPlaceholder, debugConfig.appId);
        url = url.replace(teamsAppIdPlaceholder, debugConfig.appId);
        if (isLocalM365SideloadingConfiguration) {
          const internalId = await getTeamsAppInternalId(debugConfig.appId);
          if (internalId !== undefined) {
            url = url.replace(localTeamsAppInternalIdPlaceholder, internalId);
          }
        }
        if (isM365SideloadingConfiguration) {
          const internalId = await getTeamsAppInternalId(debugConfig.appId);
          if (internalId !== undefined) {
            url = url.replace(teamsAppInternalIdPlaceholder, internalId);
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
    } catch (error: any) {
      showError(error);
      terminateAllRunningTeamsfxTasks();
      await vscode.debug.stopDebugging();
      commonUtils.endLocalDebugSession();
    }
    return debugConfiguration;
  }
}

export async function generateAccountHint(includeTenantId = true): Promise<string> {
  let tenantId = undefined,
    loginHint = undefined;
  try {
    const tokenObject = (await AppStudioTokenInstance.getStatus())?.accountInfo;
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
