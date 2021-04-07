// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import * as commonUtils from "./commonUtils";
import { core, showError } from "../handlers";
import { Func } from "fx-api";

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

        const func: Func = {
          namespace: "fx-solution-azure/teamsfx-plugin-local-debug",
          method: "getLaunchInput",
          params: isLocalSideloadingConfiguration ? ["local"] : ["remote"]
        };
        try {
          const result = await core.callFunc(func);
          if (result.isErr()) {
            throw result.error;
          }
          debugConfiguration.url = (debugConfiguration.url as string).replace(
            isLocalSideloadingConfiguration ? localTeamsAppIdPlaceholder : teamsAppIdPlaceholder,
            result.value as string
          );
        } catch (err) {
          await showError(err);
        }
      }
    } catch (err) {
      // TODO(kuojianlu): add log and telemetry
    } finally {
      return debugConfiguration;
    }
  }
}
