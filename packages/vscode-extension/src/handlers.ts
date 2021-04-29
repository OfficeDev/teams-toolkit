// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { commands, Uri, window, workspace, ExtensionContext, env, ViewColumn, debug } from "vscode";
import {
  Result,
  FxError,
  err,
  ok,
  Stage,
  Platform,
  Func,
  UserError,
  SystemError,
  returnUserError,
  returnSystemError,
  ConfigFolderName,
  traverse,
  RemoteFuncExecutor,
  Inputs,
  ConfigMap,
  InputResult,
  InputResultType,
  VsCodeEnv,
  AppStudioTokenProvider
} from "fx-api";
import { CoreProxy } from "fx-core";
import DialogManagerInstance from "./userInterface";
import GraphManagerInstance from "./commonlib/graphLogin";
import AzureAccountManager from "./commonlib/azureLogin";
import AppStudioTokenInstance from "./commonlib/appStudioLogin";
import AppStudioCodeSpaceTokenInstance from "./commonlib/appStudioCodeSpaceLogin";
import VsCodeLogInstance from "./commonlib/log";
import { VSCodeTelemetryReporter } from "./commonlib/telemetry";
import { CommandsTreeViewProvider, TreeViewCommand } from "./commandsTreeViewProvider";
import TreeViewManagerInstance from './commandsTreeViewProvider'
import * as extensionPackage from "./../package.json";
import { ext } from "./extensionVariables";
import { ExtTelemetry } from "./telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTiggerFrom,
  TelemetrySuccess
} from "./telemetry/extTelemetryEvents";
import * as commonUtils from "./debug/commonUtils";
import { ExtensionErrors, ExtensionSource } from "./error";
import { WebviewPanel } from "./controls/webviewPanel";
import * as constants from "./debug/constants";
import logger from "./commonlib/log";
import { isFeatureFlag } from "./utils/commonUtils";
import * as path from "path";
import * as fs from "fs-extra";
import * as vscode from "vscode";
import { VsCodeUI, VS_CODE_UI } from "./qm/vsc_ui";
import { DepsChecker } from "./debug/depsChecker/checker";
import { BackendExtensionsInstaller } from "./debug/depsChecker/backendExtensionsInstall";
import { FuncToolChecker } from "./debug/depsChecker/funcToolChecker";
import { DotnetChecker } from "./debug/depsChecker/dotnetChecker";
import { NodeChecker } from "./debug/depsChecker/nodeChecker";
import * as util from "util";
import * as StringResources from "./resources/Strings.json";
import { vscodeAdapter } from "./debug/depsChecker/vscodeAdapter";
import { vscodeLogger } from "./debug/depsChecker/vscodeLogger";
import { vscodeTelemetry } from "./debug/depsChecker/vscodeTelemetry";
import { PanelType } from "./controls/PanelType";

export let core: CoreProxy;
const runningTasks = new Set<string>(); // to control state of task execution

export async function activate(): Promise<Result<null, FxError>> {
  const result: Result<null, FxError> = ok(null);
  try {
    core = CoreProxy.getInstance();

    {
      const result = await core.withDialog(DialogManagerInstance);
      if (result.isErr()) {
        showError(result.error);
        return err(result.error);
      }
    }

    {
      const result = await core.withGraphToken(GraphManagerInstance);
      if (result.isErr()) {
        showError(result.error);
        return err(result.error);
      }
    }

    {
      const result = await core.withAzureAccount(AzureAccountManager);
      if (result.isErr()) {
        showError(result.error);
        return err(result.error);
      }
    }

    {
      let appstudioLogin: AppStudioTokenProvider = AppStudioTokenInstance;
      const vscodeEnv = detectVsCodeEnv();
      if (vscodeEnv === VsCodeEnv.codespaceBrowser || vscodeEnv === VsCodeEnv.codespaceVsCode) {
        appstudioLogin = AppStudioCodeSpaceTokenInstance;
      }

      const result = await core.withAppStudioToken(appstudioLogin);
      if (result.isErr()) {
        showError(result.error);
        return err(result.error);
      }
    }

    {
      const telemetry = new VSCodeTelemetryReporter(
        extensionPackage.aiKey,
        extensionPackage.name,
        extensionPackage.version
      );
      const result = await core.withTelemetry(telemetry);
      if (result.isErr()) {
        showError(result.error);
        return err(result.error);
      }
    }

    {
      const result = await core.withLogger(VsCodeLogInstance);
      if (result.isErr()) {
        showError(result.error);
        return err(result.error);
      }
    }

    {
      const result = await core.withTreeProvider(TreeViewManagerInstance.getTreeView('teamsfx-accounts')!);
      if (result.isErr()) {
        showError(result.error);
        return err(result.error);
      }
    }

    {
      const globalConfig = new ConfigMap();
      globalConfig.set("function-dotnet-checker-enabled", vscodeAdapter.dotnetCheckerEnabled());
      const result = await core.init(globalConfig);
      if (result.isErr()) {
        showError(result.error);
        return err(result.error);
      }
    }

    {
      const workspacePath: string | undefined = workspace.workspaceFolders?.length
        ? workspace.workspaceFolders[0].uri.fsPath
        : undefined;
      const result = await core.open(workspacePath);
      if (result.isErr()) {
        showError(result.error);
        return err(result.error);
      }
    }
  } catch (e) {
    const FxError: FxError = {
      name: e.name,
      source: ExtensionSource,
      message: e.message,
      stack: e.stack,
      timestamp: new Date()
    };
    showError(FxError);
    return err(FxError);
  }
  return result;
}

export async function createNewProjectHandler(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CreateProjectStart, {
    [TelemetryProperty.TriggerFrom]:
      args && args[0] === CommandsTreeViewProvider.TreeViewFlag
        ? TelemetryTiggerFrom.TreeView
        : TelemetryTiggerFrom.CommandPalette
  });
  return await runCommand(Stage.create);
}

export async function updateProjectHandler(): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateProjectStart, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });
  return await runCommand(Stage.update);
}

export async function validateManifestHandler(): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ValidateManifest, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });

  const func: Func = {
    namespace: "fx-solution-azure",
    method: "validateManifest"
  };
  return await core.executeUserTask(func);
}

export async function buildPackageHandler(): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.BuildPackage, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });

  const func: Func = {
    namespace: "fx-solution-azure",
    method: "buildPackage"
  };
  return await core.executeUserTask(func);
}

export async function provisionHandler(): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ProvisionStart, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });
  return await runCommand(Stage.provision);
}

export async function deployHandler(): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DeployStart, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });
  return await runCommand(Stage.deploy);
}

export async function publishHandler(): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.PublishStart, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });
  return await runCommand(Stage.publish);
}

const coreExeceutor: RemoteFuncExecutor = async function (
  func: Func,
  answers: Inputs | ConfigMap
): Promise<Result<unknown, FxError>> {
  return await core.callFunc(func, answers as ConfigMap);
};

export async function runCommand(stage: Stage): Promise<Result<null, FxError>> {
  const eventName = ExtTelemetry.stageToEvent(stage);
  let result: Result<null, FxError> = ok(null);

  try {
    // 1. check concurrent lock
    if (runningTasks.size > 0 && stage !== Stage.create) {
      result = err(
        new UserError(
          ExtensionErrors.ConcurrentTriggerTask,
          util.format(StringResources.vsc.handlers.concurrentTriggerTask, Array.from(runningTasks).join(",")),
          ExtensionSource
        )
      );
      await processResult(eventName, result);
      return result;
    }

    // 2. lock
    runningTasks.add(stage);

    // 3. check core not empty
    const checkCoreRes = checkCoreNotEmpty();
    if (checkCoreRes.isErr()) {
      throw checkCoreRes.error;
    }

    const answers = new ConfigMap();
    answers.set("stage", stage);
    answers.set("platform", Platform.VSCode);

    // 4. getQuestions
    const qres = await core.getQuestions(stage, Platform.VSCode);
    if (qres.isErr()) {
      throw qres.error;
    }

    const vscenv = detectVsCodeEnv();
    answers.set("vscenv", vscenv);
    VsCodeLogInstance.info(util.format(StringResources.vsc.handlers.vsCodeEnvironment, vscenv));

    // 5. run question model
    const node = qres.value;
    if (node) {
      VsCodeLogInstance.info(util.format(StringResources.vsc.handlers.questionTree, JSON.stringify(node, null, 4)));
      const res: InputResult = await traverse(node, answers, VS_CODE_UI, coreExeceutor);
      VsCodeLogInstance.info(util.format(StringResources.vsc.handlers.userInput, JSON.stringify(res, null, 4)));
      if (res.type === InputResultType.error) {
        throw res.error!;
      } else if (res.type === InputResultType.cancel) {
        throw new UserError(ExtensionErrors.UserCancel, StringResources.vsc.common.userCancel, ExtensionSource);
      }
    }

    // 6. run task
    if (stage === Stage.create) result = await core.create(answers);
    else if (stage === Stage.update) result = await core.update(answers);
    else if (stage === Stage.provision) result = await core.provision(answers);
    else if (stage === Stage.deploy) result = await core.deploy(answers);
    else if (stage === Stage.debug) result = await core.localDebug(answers);
    else if (stage === Stage.publish) result = await core.publish(answers);
    else {
      throw new SystemError(
        ExtensionErrors.UnsupportedOperation,
        util.format(StringResources.vsc.handlers.operationNotSupport, stage),
        ExtensionSource
      );
    }
  } catch (e) {
    result = wrapError(e);
  }

  // 7. unlock
  runningTasks.delete(stage);

  // 8. send telemetry and show error
  await processResult(eventName, result);

  return result;
}

export function detectVsCodeEnv(): VsCodeEnv {
    // extensionKind returns ExtensionKind.UI when running locally, so use this to detect remote
    const extension = vscode.extensions.getExtension("Microsoft.teamsfx-extension");

    if (extension?.extensionKind === vscode.ExtensionKind.Workspace) {
        // running remotely
        // Codespaces browser-based editor will return UIKind.Web for uiKind
        if (vscode.env.uiKind === vscode.UIKind.Web) {
            return VsCodeEnv.codespaceBrowser;
        } else {
            return VsCodeEnv.codespaceVsCode;
        }
    } else {
        // running locally
        return VsCodeEnv.local;
    }
  }

async function runUserTask(func: Func, eventName:string): Promise<Result<null, FxError>> {
  let result: Result<null, FxError> = ok(null);

  try {
    // 1. check concurrent lock
    if (runningTasks.size > 0) {
      result = err(
        new UserError(
          ExtensionErrors.ConcurrentTriggerTask,
          util.format(StringResources.vsc.handlers.concurrentTriggerTask, Array.from(runningTasks).join(",")),
          ExtensionSource
        )
      );
      await processResult(eventName, result);
      return result;
    }

    // 2. lock
    runningTasks.add(eventName);

    // 3. check core not empty
    const checkCoreRes = checkCoreNotEmpty();
    if (checkCoreRes.isErr()) {
      throw checkCoreRes.error;
    }

    const answers = new ConfigMap();
    answers.set("task", eventName);
    answers.set("platform", Platform.VSCode);
    
    // 4. getQuestions
    const qres = await core.getQuestionsForUserTask(func, Platform.VSCode);
    if (qres.isErr()) {
      throw qres.error;
    }

    // 5. run question model
    const node = qres.value;
    if (node) {
      VsCodeLogInstance.info(util.format(StringResources.vsc.handlers.questionTree, JSON.stringify(node, null, 4)));
      const res: InputResult = await traverse(node, answers, VS_CODE_UI, coreExeceutor);
      VsCodeLogInstance.info(util.format(StringResources.vsc.handlers.userInput, JSON.stringify(res, null, 4)));
      if (res.type === InputResultType.error && res.error) {
        throw res.error;
      } else if (res.type === InputResultType.cancel) {
        throw new UserError(ExtensionErrors.UserCancel, StringResources.vsc.common.userCancel, ExtensionSource);
      }
    }

    // 6. run task
    result = await core.executeUserTask(func, answers);
  } catch (e) {
    result = wrapError(e);
  }

  // 7. unlock
  runningTasks.delete(eventName);

  // 8. send telemetry and show error
  await processResult(eventName, result);

  return result;
}

//TODO workaround
function isCancelWarning(error: FxError): boolean {
  return (
    (!!error.name && error.name === ExtensionErrors.UserCancel) ||
    (!!error.message && error.message.includes("User Cancel"))
  );
}
//TODO workaround
function isLoginFaiureError(error: FxError): boolean {
  return !!error.message && error.message.includes("Cannot get user login information");
}

async function processResult(eventName: string, result: Result<null, FxError>) {
  if (result.isErr()) {
    ExtTelemetry.sendTelemetryErrorEvent(eventName, result.error);
    const error = result.error;
    if (isCancelWarning(error)) {
      // window.showWarningMessage(`Operation is canceled!`);
      return;
    }
    if (isLoginFaiureError(error)) {
      window.showErrorMessage(StringResources.vsc.handlers.loginFailed);
      return;
    }
    showError(error);
  } else {
    ExtTelemetry.sendTelemetryEvent(eventName, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes
    });
  }
}

function wrapError(e: Error): Result<null, FxError> {
  if (
    e instanceof UserError ||
    e instanceof SystemError ||
    (e.constructor &&
      e.constructor.name &&
      (e.constructor.name === "SystemError" || e.constructor.name === "UserError"))
  ) {
    return err(e as FxError);
  }
  return err(returnSystemError(e, ExtensionSource, ExtensionErrors.UnknwonError));
}

function checkCoreNotEmpty(): Result<null, SystemError> {
  if (!core) {
    return err(
      returnSystemError(
        new Error(StringResources.vsc.handlers.coreNotReady),
        ExtensionSource,
        ExtensionErrors.UnsupportedOperation
      )
    );
  }
  return ok(null);
}

/**
 * manually added customized command
 */
export async function updateAADHandler(): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateAadStart, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });
  const func: Func = {
    namespace: "fx-solution-azure/fx-resource-aad-app-for-teams",
    method: "aadUpdatePermission"
  };
  return await runUserTask(func, TelemetryEvent.UpdateAad);
}


export async function addCapabilityHandler(): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.AddCapStart, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });
  const func: Func = {
    namespace: "fx-solution-azure",
    method: "addCapability"
  };
  return await runUserTask(func, TelemetryEvent.AddCap);
}

/**
 * check & install required dependencies during local debug.
 */
export async function validateDependenciesHandler(): Promise<void> {
  const depsChecker = new DepsChecker(vscodeLogger, vscodeAdapter, [
    new NodeChecker(vscodeAdapter, vscodeLogger, vscodeTelemetry), 
    new DotnetChecker(vscodeAdapter, vscodeLogger, vscodeTelemetry)]);
  const shouldContinue = await depsChecker.resolve();
  if (!shouldContinue) {
    // TODO: better mechanism to stop the tasks and debug session.
    throw new Error("debug stopped.");
  }
}

/**
 * install functions binding before launch local debug
 */
export async function backendExtensionsInstallHandler(): Promise<void> {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const workspaceFolder = workspace.workspaceFolders[0];
    const backendRoot = await commonUtils.getProjectRoot(
      workspaceFolder.uri.fsPath,
      constants.backendFolderName
    );

    if (backendRoot) {
      const dotnetChecker = new DotnetChecker(vscodeAdapter, vscodeLogger, vscodeTelemetry);
      const backendExtensionsInstaller = new BackendExtensionsInstaller(dotnetChecker, vscodeLogger);

      await backendExtensionsInstaller.install(backendRoot);
    }
  }
}

/**
 * call localDebug on core, then call customized function to return result
 */
export async function preDebugCheckHandler(): Promise<void> {
  let result: Result<any, FxError> = ok(null);
  result = await runCommand(Stage.debug);
  if (result.isErr()) {
    throw result.error;
  }
  // } catch (e) {
  //   result = wrapError(e);
  //   const eventName = ExtTelemetry.stageToEvent(Stage.debug);
  //   await processResult(eventName, result);
  //   // If debug stage fails, throw error to terminate the debug process
  //   throw result;
  // }
}

export async function openDocumentHandler(): Promise<boolean> {
  return env.openExternal(Uri.parse("https://aka.ms/build-first-app"));
}

export async function openWelcomeHandler() {
  if (isFeatureFlag()) {
    WebviewPanel.createOrShow(ext.context.extensionPath, PanelType.QuickStart);
  } else {
    const welcomePanel = window.createWebviewPanel("react", StringResources.vsc.handlers.teamsToolkit, ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true
    });
    welcomePanel.webview.html = getHtmlForWebview();
  }
}

export async function openSamplesHandler() {
  WebviewPanel.createOrShow(ext.context.extensionPath, PanelType.SampleGallery);
}

export async function openAppManagement() {
  return env.openExternal(Uri.parse("https://dev.teams.microsoft.com/apps"));
}

export async function openBotManagement() {
  return env.openExternal(Uri.parse("https://dev.teams.microsoft.com/bots"));
}

export async function openReportIssues() {
  return env.openExternal(Uri.parse("https://github.com/OfficeDev/TeamsFx/issues"));
}

export async function openManifestHandler(): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenManifestEditor, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.TreeView
  });
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const workspaceFolder = workspace.workspaceFolders[0];
    const configRoot = await commonUtils.getProjectRoot(
      workspaceFolder.uri.fsPath,
      `.${ConfigFolderName}`
    );
    const manifestFile = `${configRoot}/${constants.manifestFileName}`;
    if (fs.existsSync(manifestFile)) {
      workspace.openTextDocument(manifestFile).then((document) => {
        window.showTextDocument(document);
      });
      return ok(null);
    } else {
      const FxError: FxError = {
        name: "FileNotFound",
        source: ExtensionSource,
        message: util.format(StringResources.vsc.handlers.fileNotFound, manifestFile),
        timestamp: new Date()
      };
      showError(FxError);
      return err(FxError);
    }
  } else {
    const FxError: FxError = {
      name: "NoWorkspace",
      source: ExtensionSource,
      message: StringResources.vsc.handlers.noOpenWorkspace,
      timestamp: new Date()
    };
    showError(FxError);
    return err(FxError);
  }
}

export async function openM365AccountHandler() {
  return env.openExternal(Uri.parse("https://admin.microsoft.com/Adminportal/"));
}

export async function openAzureAccountHandler() {
  return env.openExternal(Uri.parse("https://ms.portal.azure.com/"));
}

// TODO: remove this once welcome page is ready
function getHtmlForWebview() {
  return `<!DOCTYPE html>
  <html>

  <head>
    <meta charset="utf-8" />
    <title>Teams Toolkit</title>
  </head>

  <body>
    <div class="message-container">
      <div class="message">
        Coming Soon...
      </div>
    </div>
    <style type="text/css">
      html {
        height: 100%;
      }

      body {
        box-sizing: border-box;
        min-height: 100%;
        margin: 0;
        padding: 15px 30px;
        display: flex;
        flex-direction: column;
        color: white;
        font-family: "Segoe UI", "Helvetica Neue", "Helvetica", Arial, sans-serif;
        background-color: #2C2C32;
      }

      .message-container {
        flex-grow: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 30px;
      }

      .message {
        font-weight: 300;
        font-size: 1.4rem;
      }
    </style>
  </body>
  </html>`;
}

export async function cmdHdlLoadTreeView(context: ExtensionContext) {
  const disposables = TreeViewManagerInstance.registerTreeViews();
  context.subscriptions.push(...disposables);

  // Register SignOut tree view command
  commands.registerCommand("fx-extension.signOut", async (node: TreeViewCommand) => {
    switch (node.contextValue) {
      case "signedinM365": {
        let appstudioLogin: AppStudioTokenProvider = AppStudioTokenInstance;
        const vscodeEnv = detectVsCodeEnv();
        if (vscodeEnv === VsCodeEnv.codespaceBrowser || vscodeEnv === VsCodeEnv.codespaceVsCode) {
          appstudioLogin = AppStudioCodeSpaceTokenInstance;
        }
        const result = await appstudioLogin.signout();
        if (result) {
          await TreeViewManagerInstance.getTreeView('teamsfx-accounts')!.refresh([
            {
              commandId: "fx-extension.signinM365",
              label: StringResources.vsc.handlers.signIn365,
              contextValue: "signinM365"
            }
          ]);
        }
        break;
      }
      case "signedinAzure": {
        const result = await AzureAccountManager.signout();
        if (result) {
          await TreeViewManagerInstance.getTreeView('teamsfx-accounts')!.refresh([
            {
              commandId: "fx-extension.signinAzure",
              label: StringResources.vsc.handlers.signInAzure,
              contextValue: "signinAzure"
            }
          ]);
          await TreeViewManagerInstance.getTreeView('teamsfx-accounts')!.remove([
            {
              commandId: "fx-extension.selectSubscription",
              label: "",
              parent: "fx-extension.signinAzure"
            }
          ]);
        }
        break;
      }
    }
  });
}

export function cmdHdlDisposeTreeView() {
  TreeViewManagerInstance.dispose();
}

export async function showError(e: FxError) {
  VsCodeLogInstance.error(`code:${e.source}.${e.name}, message: ${e.message}, stack: ${e.stack}`);

  const errorCode = `${e.source}.${e.name}`;
  if (e instanceof UserError && e.helpLink && typeof e.helpLink != "undefined") {
    const help = {
      title: StringResources.vsc.handlers.getHelp,
      run: async (): Promise<void> => {
        commands.executeCommand("vscode.open", Uri.parse(`${e.helpLink}#${errorCode}`));
      }
    };

    const button = await window.showErrorMessage(`[${errorCode}]: ${e.message}`, help);
    if (button) await button.run();
  } else if (e instanceof SystemError && e.issueLink && typeof e.issueLink != "undefined") {
    const path = e.issueLink.replace(/\/$/, "") + "?";
    const param = `title=new+bug+report: ${errorCode}&body=${e.message}\n\n${e.stack}`;
    const issue = {
      title: StringResources.vsc.handlers.reportIssue,
      run: async (): Promise<void> => {
        commands.executeCommand("vscode.open", Uri.parse(`${path}${param}`));
      }
    };

    const button = await window.showErrorMessage(`[${errorCode}]: ${e.message}`, issue);
    if (button) await button.run();
  } else {
    await window.showErrorMessage(`[${errorCode}]: ${e.message}`);
  }
}
