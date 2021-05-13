// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import AppStudioTokenInstance from "../commonlib/appStudioLogin";
import * as commonUtils from "./commonUtils";
import { core, showError } from "../handlers";
import { Func } from "@microsoft/teamsfx-api";

export class TeamsfxDebugProvider implements vscode.DebugConfigurationProvider {
  public async resolveDebugConfiguration?(
    folder: vscode.WorkspaceFolder | undefined,
    debugConfiguration: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): Promise<vscode.DebugConfiguration | undefined> {
    try {
      if (folder) {
        if (!(await commonUtils.isFxProject(folder.uri.fsPath))) {
          return debugConfiguration;
        }

        if (debugConfiguration.url === undefined) {
          return debugConfiguration;
        }

        const localTeamsAppIdPlaceholder = "${localTeamsAppId}";
        const isLocalSideloadingConfiguration: boolean = (debugConfiguration.url as string).includes(
          localTeamsAppIdPlaceholder
        );
        const teamsAppIdPlaceholder = "${teamsAppId}";
        const isSideloadingConfiguration: boolean = (debugConfiguration.url as string).includes(
          teamsAppIdPlaceholder
        );

        if (!isLocalSideloadingConfiguration && !isSideloadingConfiguration) {
          return debugConfiguration;
        }

        const teamsAppId = await commonUtils.getLocalDebugTeamsAppId(isLocalSideloadingConfiguration);
        debugConfiguration.url = (debugConfiguration.url as string).replace(
          isLocalSideloadingConfiguration ? localTeamsAppIdPlaceholder : teamsAppIdPlaceholder,
          teamsAppId as string
        );

        const accountHintPlaceholder = "${account-hint}";
        const isaccountHintConfiguration: boolean = (debugConfiguration.url as string).includes(
          accountHintPlaceholder
        );
        if (isaccountHintConfiguration) {
          let tenantId = undefined, loginHint = undefined;
          try {
            const tokenObject = await AppStudioTokenInstance.getJsonObject(false);
            tenantId = tokenObject?.tid;
            loginHint = tokenObject?.upn;
          } catch {
            // ignore error
          }
          if (tenantId && loginHint) {
            debugConfiguration.url = (debugConfiguration.url as string).replace(
              accountHintPlaceholder,
              `appTenantId=${tenantId}&login_hint=${loginHint}`
            );
          } else {
            debugConfiguration.url = (debugConfiguration.url as string).replace(
              accountHintPlaceholder,
              ""
            );
          }
        }
      }
    } catch (err) {
      // TODO(kuojianlu): add log and telemetry
    } finally {
      return debugConfiguration;
    }
  }
}
