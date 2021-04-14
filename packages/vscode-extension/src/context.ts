// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Context, ConfigMap } from "fx-api";
import * as os from "os";
import { workspace } from "vscode";

import DialogManagerInstance from "./userInterface";
import GraphManagerInstance from "./commonlib/graphLogin";
import AzureAccountManager from "./commonlib/azureLogin";
import AppStudioTokenInstance from "./commonlib/appStudioLogin";
import VsCodeLogInstance from "./commonlib/log";
import { VSCodeTelemetryReporter } from "./commonlib/telemetry";
import { CommandsTreeViewProvider } from "./commandsTreeViewProvider";
import { isFeatureFlag } from "./utils/commonUtils";
import { dotnetChecker } from "./debug/depsChecker/dotnetChecker";
import * as extensionPackage from "./../package.json";

export class ContextFactory {
  public static get(): Context {
    const globalConfig = new ConfigMap();
    globalConfig.set("featureFlag", isFeatureFlag());
    globalConfig.set("function-dotnet-checker-enabled", dotnetChecker.isEnabled());
    const workspacePath: string | undefined = workspace.workspaceFolders?.length
      ? workspace.workspaceFolders[0].uri.fsPath
      : undefined;
    return {
      root: workspacePath ?? `${os.homedir()}/teams`,
      dialog: DialogManagerInstance,
      logProvider: VsCodeLogInstance,
      telemetryReporter: new VSCodeTelemetryReporter(
        extensionPackage.aiKey,
        extensionPackage.name,
        extensionPackage.version
      ),
      azureAccountProvider: AzureAccountManager,
      graphTokenProvider: GraphManagerInstance,
      appStudioToken: AppStudioTokenInstance,
      treeProvider: CommandsTreeViewProvider.getInstance(),
      globalConfig: globalConfig
    };
  }
}
