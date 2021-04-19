// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { commands, Uri, window, workspace, ExtensionContext, env, ViewColumn, debug } from "vscode";
import {
  Result,
  FxError,
  err,
  ok,
  Task,
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
  InputResult,
  InputResultType,
  VsCodeEnv,
  AppStudioTokenProvider,
  Tools,
  DialogMsg,
  DialogType,
  QuestionType,
  Void
} from "fx-api";
import { deepCopy, FxCore } from "fx-core";
import DialogManagerInstance from "./userInterface";
import GraphManagerInstance from "./commonlib/graphLogin";
import AzureAccountManager from "./commonlib/azureLogin";
import AppStudioTokenInstance from "./commonlib/appStudioLogin";
import AppStudioCodeSpaceTokenInstance from "./commonlib/appStudioCodeSpaceLogin";
import VsCodeLogInstance from "./commonlib/log";
import { VSCodeTelemetryReporter } from "./commonlib/telemetry";
import { CommandsTreeViewProvider, TreeViewCommand } from "./commandsTreeViewProvider";
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
import { backendExtensionsInstall } from "./debug/depsChecker/backendExtensionsInstall";
import { FuncToolChecker } from "./debug/depsChecker/funcToolChecker";
import { DotnetChecker, dotnetChecker } from "./debug/depsChecker/dotnetChecker";
import { PanelType } from "./controls/PanelType";
import { NodeChecker } from "./debug/depsChecker/nodeChecker";

export let core: FxCore;
export const globalInputs: Inputs = {platform:Platform.VSCode, projectPath:""};
export const runningTasks = new Set<string>(); // to control state of task execution

export async function activate(): Promise<Result<Void, FxError>> {
  let result: Result<Void, FxError> = ok(Void);
  try {
    let appstudioLogin: AppStudioTokenProvider = AppStudioTokenInstance;
    const vscodeEnv = detectVsCodeEnv();
    if (vscodeEnv === VsCodeEnv.codespaceBrowser || vscodeEnv === VsCodeEnv.codespaceVsCode) {
      appstudioLogin = AppStudioCodeSpaceTokenInstance;
    }
    const telemetry = new VSCodeTelemetryReporter(
      extensionPackage.aiKey,
      extensionPackage.name,
      extensionPackage.version
    );
    const tools:Tools = {
      logProvider: VsCodeLogInstance,
      tokenProvider: {
        azure: AzureAccountManager,
        graph: GraphManagerInstance,
        appStudio: appstudioLogin
      },
      telemetryReporter: telemetry,
      treeProvider:CommandsTreeViewProvider.getInstance(),
      ui: VS_CODE_UI
    };
    core = new FxCore(tools); 
    const workspacePath: string | undefined = workspace.workspaceFolders?.length? workspace.workspaceFolders[0].uri.fsPath : undefined;
    globalInputs["function-dotnet-checker-enabled"] = await dotnetChecker.isEnabled();
    if(workspacePath) globalInputs.projectPath = workspacePath;
    globalInputs.vscodeEnv = detectVsCodeEnv();
    result = await core.init(globalInputs);
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

export async function createNewProjectHandler(args?: any[]): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CreateProjectStart, {
    [TelemetryProperty.TriggerFrom]:
      args && args[0] === CommandsTreeViewProvider.TreeViewFlag
        ? TelemetryTiggerFrom.TreeView
        : TelemetryTiggerFrom.CommandPalette
  });
  return await runCommand(Task.create);
}

export async function addResourceProjectHandler(): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateProjectStart, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });
  const func: Func = {
    namespace: "fx-solution-azure",
    method: "addResource"
  };
  return await core.executeUserTask(func, globalInputs);
}

export async function validateManifestHandler(): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ValidateManifest, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });

  const func: Func = {
    namespace: "fx-solution-azure",
    method: "validateManifest"
  };
  return await core.executeUserTask(func, globalInputs);
}

export async function buildPackageHandler(): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.BuildPackage, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });

  const func: Func = {
    namespace: "fx-solution-azure",
    method: "buildPackage"
  };
  return await core.executeUserTask(func, globalInputs);
}

export async function provisionHandler(): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ProvisionStart, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });
  return await runCommand(Task.provision);
}

export async function buildHandler(): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.BuildProjectStart, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });
  return await runCommand(Task.build);
}

export async function deployHandler(): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DeployStart, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });
  return await runCommand(Task.deploy);
}

export async function publishHandler(): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.PublishStart, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });
  return await runCommand(Task.publish);
}

const coreExeceutor: RemoteFuncExecutor = async function ( func: Func, answers: Inputs
): Promise<Result<unknown, FxError>> {
  return await core.executeQuestionFlowFunction(func, answers);
};

export async function runCommand(task: Task): Promise<Result<unknown, FxError>> {
  const eventName = ExtTelemetry.TaskToEvent(task);
  let result: Result<unknown, FxError> = ok(Void);
  try {
    // 1. check concurrent lock
    if (runningTasks.size > 0 && task !== Task.create) {
      result = err(
        new UserError(
          ExtensionErrors.ConcurrentTriggerTask,
          `task '${Array.from(runningTasks).join(",")}' is still running, please wait!`,
          ExtensionSource
        )
      );
      await processResult(eventName, result);
      return result;
    }

    // 2. lock
    runningTasks.add(task);

    // 3. check core not empty
    const checkCoreRes = checkCoreNotEmpty();
    if (checkCoreRes.isErr()) {
      throw checkCoreRes.error;
    }
 

    // 4. getQuestions
    const qres = await core.getQuestionsForLifecycleTask(task, globalInputs);
    if (qres.isErr()) {
      throw qres.error;
    }

    
    VsCodeLogInstance.info(`VS Code Environment: ${globalInputs.vscodeEnv}`);

    // 5. run question model
    const inputs = deepCopy(globalInputs);
    const node = qres.value;
    if (node) {
      VsCodeLogInstance.info(`Question tree:${JSON.stringify(node, null, 4)}`);
      const res: InputResult = await traverse(node, inputs, VS_CODE_UI, coreExeceutor);
      VsCodeLogInstance.info(`User input:${JSON.stringify(res, null, 4)}`);
      if (res.type === InputResultType.error) {
        throw res.error!;
      } else if (res.type === InputResultType.cancel) {
        throw new UserError(ExtensionErrors.UserCancel, "User Cancel", ExtensionSource);
      }
    }

    // 6. run task
    if (task === Task.create){
      const tmpResult = await core.create(inputs);
      if (tmpResult.isErr()) {
          result = err(tmpResult.error);
      } else {
          await DialogManagerInstance.communicate(
              new DialogMsg(DialogType.Ask, {
                  type: QuestionType.OpenFolder,
                  description: tmpResult.value,
              }),
          );
          result = ok(null);
      }
    } 
    else if (task === Task.provision) result = await core.provision(inputs);
    else if (task === Task.deploy) result = await core.deploy(inputs);
    else if (task === Task.build) result = await core.build(inputs);
    else if (task === Task.publish) result = await core.publish(inputs);
    else {
      throw new SystemError(
        ExtensionErrors.UnsupportedOperation,
        `Operation not support:${Task}`,
        ExtensionSource
      );
    }
  } catch (e) {
    result = wrapError(e);
  }

  // 7. unlock
  runningTasks.delete(task);

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

async function runUserTask(func: Func): Promise<Result<unknown, FxError>> {
  const eventName = func.method;
  let result: Result<unknown, FxError> = ok(Void);

  try {
    // 1. check concurrent lock
    if (runningTasks.size > 0) {
      result = err(
        new UserError(
          ExtensionErrors.ConcurrentTriggerTask,
          `task '${Array.from(runningTasks).join(",")}' is still running, please wait!`,
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

    // 4. getQuestions
    const qres = await core.getQuestionsForUserTask(func, globalInputs);
    if (qres.isErr()) {
      throw qres.error;
    }

    // 5. run question model
    const inputs = deepCopy(globalInputs);
    const node = qres.value;
    if (node) {
      VsCodeLogInstance.info(`Question tree:${JSON.stringify(node, null, 4)}`);
      const res: InputResult = await traverse(node, inputs, VS_CODE_UI, coreExeceutor);
      VsCodeLogInstance.info(`User input:${JSON.stringify(res, null, 4)}`);
      if (res.type === InputResultType.error && res.error) {
        throw res.error;
      } else if (res.type === InputResultType.cancel) {
        throw new UserError(ExtensionErrors.UserCancel, "User Cancel", ExtensionSource);
      }
    }

    // 6. run task
    result = await core.executeUserTask(func, inputs);
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

async function processResult(eventName: string, result: Result<unknown, FxError>) {
  if (result.isErr()) {
    ExtTelemetry.sendTelemetryErrorEvent(eventName, result.error);
    const error = result.error;
    if (isCancelWarning(error)) {
      // window.showWarningMessage(`Operation is canceled!`);
      return;
    }
    if (isLoginFaiureError(error)) {
      window.showErrorMessage(`Login failed, the operation is terminated.`);
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
        new Error("Core module is not ready!\n Can't do other actions!"),
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
export async function updateAADHandler(): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateAadStart, {
    [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  });
  const func: Func = {
    namespace: "fx-solution-azure/fx-resource-aad-app-for-teams",
    method: "aadUpdatePermission"
  };
  return await runUserTask(func);
}


export async function addCapabilityHandler(): Promise<Result<unknown, FxError>> {
  // ExtTelemetry.sendTelemetryEvent(TelemetryEvent.AddCapStart, {
  //   [TelemetryProperty.TriggerFrom]: TelemetryTiggerFrom.CommandPalette
  // });
  const func: Func = {
    namespace: "fx-solution-azure",
    method: "addCapability"
  };
  return await runUserTask(func);
}

/**
 * check & install required dependencies during local debug.
 */
export async function validateDependenciesHandler(): Promise<void> {
  const depsChecker = new DepsChecker([new NodeChecker(), new FuncToolChecker(), new DotnetChecker()]);
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
      await backendExtensionsInstall(backendRoot);
    }
  }
}

/**
 * call localDebug on core, then call customized function to return result
 */
export async function preDebugCheckHandler(): Promise<void> {
  // let result: Result<any, FxError> = ok(null);
  // result = await runCommand(Task.debug);
  // if (result.isErr()) {
  //   throw result.error;
  // }
  // } catch (e) {
  //   result = wrapError(e);
  //   const eventName = ExtTelemetry.TaskToEvent(Task.debug);
  //   await processResult(eventName, result);
  //   // If debug Task fails, throw error to terminate the debug process
  //   throw result;
  // }
}

export async function mailtoHandler(): Promise<boolean> {
  return env.openExternal(Uri.parse("https://github.com/OfficeDev/teamsfx/issues/new"));
}

export async function openDocumentHandler(): Promise<boolean> {
  return env.openExternal(Uri.parse("https://github.com/OfficeDev/teamsfx/"));
}

export async function devProgramHandler(): Promise<boolean> {
  return env.openExternal(Uri.parse("https://developer.microsoft.com/en-us/microsoft-365/dev-program"));
}

export async function openWelcomeHandler() {
  if (isFeatureFlag()) {
    WebviewPanel.createOrShow(ext.context.extensionPath, PanelType.QuickStart);
  } else {
    const welcomePanel = window.createWebviewPanel("react", "Teams Toolkit", ViewColumn.One, {
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
        message: `${manifestFile} not found, cannot open it.`,
        timestamp: new Date()
      };
      showError(FxError);
      return err(FxError);
    }
  } else {
    const FxError: FxError = {
      name: "NoWorkspace",
      source: ExtensionSource,
      message: `No open workspace`,
      timestamp: new Date()
    };
    showError(FxError);
    return err(FxError);
  }
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
  const treeViewProvider = CommandsTreeViewProvider.getInstance();
  const provider = window.registerTreeDataProvider("teamsfx", treeViewProvider);
  context.subscriptions.push(provider);

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
          await CommandsTreeViewProvider.getInstance().refresh([
            {
              commandId: "fx-extension.signinM365",
              label: "Sign In M365...",
              contextValue: "signinM365"
            }
          ]);
        }
        break;
      }
      case "signedinAzure": {
        const result = await AzureAccountManager.signout();
        if (result) {
          await CommandsTreeViewProvider.getInstance().refresh([
            {
              commandId: "fx-extension.signinAzure",
              label: "Sign In Azure...",
              contextValue: "signinAzure"
            }
          ]);
          await CommandsTreeViewProvider.getInstance().remove([
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
  CommandsTreeViewProvider.getInstance().dispose();
}

export async function showError(e: FxError) {
  VsCodeLogInstance.error(`code:${e.source}.${e.name}, message: ${e.message}, stack: ${e.stack}`);

  const errorCode = `${e.source}.${e.name}`;
  if (e instanceof UserError && e.helpLink && typeof e.helpLink != "undefined") {
    const help = {
      title: "Get Help",
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
      title: "Report Issue",
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
