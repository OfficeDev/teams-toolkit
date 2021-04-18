// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {Context, ConfigMap, Platform, Stage, VsCodeEnv, AppStudioTokenProvider} from "fx-api";
import * as os from "os";
import {workspace} from "vscode";

import DialogManagerInstance from "./userInterface";
import GraphManagerInstance from "./commonlib/graphLogin";
import AzureAccountManager from "./commonlib/azureLogin";
import AppStudioTokenInstance from "./commonlib/appStudioLogin";
import VsCodeLogInstance from "./commonlib/log";
import {VSCodeTelemetryReporter} from "./commonlib/telemetry";
import {CommandsTreeViewProvider} from "./commandsTreeViewProvider";
import AppStudioCodeSpaceTokenInstance from "./commonlib/appStudioCodeSpaceLogin";
import {dotnetChecker} from "./debug/depsChecker/dotnetChecker";
import * as extensionPackage from "./../package.json";
import {detectVsCodeEnv} from "./handlers";

export class ContextFactory {
  public static async get(stage: Stage): Promise<Context> {
    // globalconfig
    const globalConfig = new ConfigMap();
    globalConfig.set("function-dotnet-checker-enabled", await dotnetChecker.isEnabled());

    // root
    const workspacePath: string | undefined = workspace.workspaceFolders?.length
      ? workspace.workspaceFolders[0].uri.fsPath
      : undefined;

    // appstudio
    let appStudioLogin: AppStudioTokenProvider = AppStudioTokenInstance;
    const vscodeEnv = detectVsCodeEnv();
    if (vscodeEnv === VsCodeEnv.codespaceBrowser || vscodeEnv === VsCodeEnv.codespaceVsCode) {
      appStudioLogin = AppStudioCodeSpaceTokenInstance;
    }

    // telemetry
    const telemetry = new VSCodeTelemetryReporter(
      extensionPackage.aiKey,
      extensionPackage.name,
      extensionPackage.version
    );

    return {
      root: workspacePath ?? `${os.homedir()}/teams`,
      stage: stage,
      dialog: DialogManagerInstance,
      logProvider: VsCodeLogInstance,
      telemetryReporter: telemetry,
      azureAccountProvider: AzureAccountManager,
      graphTokenProvider: GraphManagerInstance,
      appStudioToken: appStudioLogin,
      treeProvider: CommandsTreeViewProvider.getInstance(),
      globalConfig: globalConfig,
      platform: Platform.VSCode
    };
  }
}


