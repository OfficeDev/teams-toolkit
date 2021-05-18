// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  commands,
  Uri,
  window,
  workspace,
  ExtensionContext,
  env,
  debug,
  QuickPickItem,
} from "vscode";
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
  returnSystemError,
  ConfigFolderName,
  traverse,
  RemoteFuncExecutor,
  Inputs,
  ConfigMap,
  InputResult,
  InputResultType,
  VsCodeEnv,
  AppStudioTokenProvider,
} from "@microsoft/teamsfx-api";
import { CoreProxy, isUserCancelError } from "@microsoft/teamsfx-core";
import DialogManagerInstance from "./userInterface";
import GraphManagerInstance from "./commonlib/graphLogin";
import AzureAccountManager from "./commonlib/azureLogin";
import AppStudioTokenInstance from "./commonlib/appStudioLogin";
import AppStudioCodeSpaceTokenInstance from "./commonlib/appStudioCodeSpaceLogin";
import VsCodeLogInstance from "./commonlib/log";
import { VSCodeTelemetryReporter } from "./commonlib/telemetry";
import { TreeViewCommand } from "./commandsTreeViewProvider";
import TreeViewManagerInstance from "./commandsTreeViewProvider";
import * as extensionPackage from "./../package.json";
import { ext } from "./extensionVariables";
import { ExtTelemetry } from "./telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTiggerFrom,
  TelemetrySuccess,
  AccountType,
} from "./telemetry/extTelemetryEvents";
import * as commonUtils from "./debug/commonUtils";
import { ExtensionErrors, ExtensionSource } from "./error";
import { WebviewPanel } from "./controls/webviewPanel";
import * as constants from "./debug/constants";
import { isSPFxProject } from "./utils/commonUtils";
import * as fs from "fs-extra";
import * as vscode from "vscode";
import { DepsChecker } from "./debug/depsChecker/checker";
import { BackendExtensionsInstaller } from "./debug/depsChecker/backendExtensionsInstall";
import { DotnetChecker } from "./debug/depsChecker/dotnetChecker";
import * as util from "util";
import * as StringResources from "./resources/Strings.json";
import { vscodeAdapter } from "./debug/depsChecker/vscodeAdapter";
import { vscodeLogger } from "./debug/depsChecker/vscodeLogger";
import { vscodeTelemetry } from "./debug/depsChecker/vscodeTelemetry";
import { PanelType } from "./controls/PanelType";
import { signedIn, signedOut } from "./commonlib/common/constant";
import { AzureNodeChecker } from "./debug/depsChecker/azureNodeChecker";
import { SPFxNodeChecker } from "./debug/depsChecker/spfxNodeChecker";
import { terminateAllRunningTeamsfxTasks } from "./debug/teamsfxTaskHandler";
import { VS_CODE_UI } from "./qm/vsc_ui";

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
      AzureAccountManager.setStatusChangeMap(
        "successfully-sign-in-azure",
        (status, token, accountInfo) => {
          if (status === signedIn) {
            window.showInformationMessage(StringResources.vsc.handlers.azureSignIn);
          } else if (status === signedOut) {
            window.showInformationMessage(StringResources.vsc.handlers.azureSignOut);
          }
          return Promise.resolve();
        },
        false
      );
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

      appstudioLogin.setStatusChangeMap(
        "successfully-sign-in-m365",
        (status, token, accountInfo) => {
          if (status === signedIn) {
            window.showInformationMessage(StringResources.vsc.handlers.m365SignIn);
          } else if (status === signedOut) {
            window.showInformationMessage(StringResources.vsc.handlers.m365SignOut);
          }
          return Promise.resolve();
        },
        false
      );

      const result = await core.withAppStudioToken(appstudioLogin);
      if (result.isErr()) {
        showError(result.error);
        return err(result.error);
      }
    }

    {
      const telemetry = new VSCodeTelemetryReporter(
        extensionPackage.aiKey,
        extensionPackage.version,
        extensionPackage.name
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
      const result = await core.withTreeProvider(
        TreeViewManagerInstance.getTreeView("teamsfx-accounts")!
      );
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
    {
      await openMarkdownHandler();
    }
  } catch (e) {
    const FxError: FxError = {
      name: e.name,
      source: ExtensionSource,
      message: e.message,
      stack: e.stack,
      timestamp: new Date(),
    };
    showError(FxError);
    return err(FxError);
  }
  return result;
}

export async function createNewProjectHandler(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CreateProjectStart, getTriggerFromProperty(args));
  return await runCommand(Stage.create);
}

export async function updateProjectHandler(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateProjectStart, getTriggerFromProperty(args));
  return await runCommand(Stage.update);
}

export async function validateManifestHandler(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.ValidateManifestStart,
    getTriggerFromProperty(args)
  );

  const func: Func = {
    namespace: "fx-solution-azure",
    method: "validateManifest",
  };
  const result = await core.executeUserTask(func);
  if (result.isErr()) {
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ValidateManifest, result.error);
  } else {
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ValidateManifest, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
  }

  return result;
}

export async function buildPackageHandler(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.BuildStart, getTriggerFromProperty(args));

  const func: Func = {
    namespace: "fx-solution-azure",
    method: "buildPackage",
  };
  const result = await core.executeUserTask(func);
  if (result.isErr()) {
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.Build, result.error);
  } else {
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Build, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
  }

  return result;
}

export async function provisionHandler(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ProvisionStart, getTriggerFromProperty(args));
  return await runCommand(Stage.provision);
}

export async function deployHandler(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DeployStart, getTriggerFromProperty(args));
  return await runCommand(Stage.deploy);
}

export async function publishHandler(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.PublishStart, getTriggerFromProperty(args));
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
          util.format(
            StringResources.vsc.handlers.concurrentTriggerTask,
            Array.from(runningTasks).join(",")
          ),
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
      const res: InputResult = await traverse(node, answers, VS_CODE_UI, coreExeceutor);
      if (res.type === InputResultType.error) {
        throw res.error!;
      } else if (res.type === InputResultType.cancel) {
        throw new UserError(
          ExtensionErrors.UserCancel,
          StringResources.vsc.common.userCancel,
          ExtensionSource
        );
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
    if ("name" in e && (e as FxError).name === "DoProvisionFirst") {
      runningTasks.delete(stage);
      if (eventName) {
        ExtTelemetry.sendTelemetryEvent(eventName, {
          [TelemetryProperty.Success]: TelemetrySuccess.No,
        });
      }
      return await provisionHandler();
    }
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
    } else if (vscode.env.remoteName === "codespaces") {
      return VsCodeEnv.codespaceVsCode;
    } else {
      return VsCodeEnv.remote;
    }
  } else {
    // running locally
    return VsCodeEnv.local;
  }
}

async function runUserTask(func: Func, eventName: string): Promise<Result<null, FxError>> {
  let result: Result<null, FxError> = ok(null);

  try {
    // 1. check concurrent lock
    if (runningTasks.size > 0) {
      result = err(
        new UserError(
          ExtensionErrors.ConcurrentTriggerTask,
          util.format(
            StringResources.vsc.handlers.concurrentTriggerTask,
            Array.from(runningTasks).join(",")
          ),
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
      const res: InputResult = await traverse(node, answers, VS_CODE_UI, coreExeceutor);
      if (res.type === InputResultType.error && res.error) {
        throw res.error;
      } else if (res.type === InputResultType.cancel) {
        throw new UserError(
          ExtensionErrors.UserCancel,
          StringResources.vsc.common.userCancel,
          ExtensionSource
        );
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
function isLoginFaiureError(error: FxError): boolean {
  return !!error.message && error.message.includes("Cannot get user login information");
}

async function processResult(eventName: string | undefined, result: Result<null, FxError>) {
  if (result.isErr()) {
    if (eventName) {
      ExtTelemetry.sendTelemetryErrorEvent(eventName, result.error);
    }
    const error = result.error;
    if (isUserCancelError(error)) {
      return;
    }
    if (isLoginFaiureError(error)) {
      window.showErrorMessage(StringResources.vsc.handlers.loginFailed);
      return;
    }
    showError(error);
  } else {
    if (eventName) {
      ExtTelemetry.sendTelemetryEvent(eventName, {
        [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      });
    }
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
export async function updateAADHandler(args: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateAadStart, getTriggerFromProperty(args));
  const func: Func = {
    namespace: "fx-solution-azure/fx-resource-aad-app-for-teams",
    method: "aadUpdatePermission",
  };
  return await runUserTask(func, TelemetryEvent.UpdateAad);
}

export async function addCapabilityHandler(args: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.AddCapStart, getTriggerFromProperty(args));
  const func: Func = {
    namespace: "fx-solution-azure",
    method: "addCapability",
  };
  return await runUserTask(func, TelemetryEvent.AddCap);
}

/**
 * check & install required dependencies during local debug when selected hosting type is Azure.
 */
export async function validateDependenciesHandler(): Promise<void> {
  const nodeChecker = new AzureNodeChecker(vscodeAdapter, vscodeLogger, vscodeTelemetry);
  const dotnetChecker = new DotnetChecker(vscodeAdapter, vscodeLogger, vscodeTelemetry);
  const depsChecker = new DepsChecker(vscodeLogger, vscodeAdapter, [nodeChecker, dotnetChecker]);
  await validateDependenciesCore(depsChecker);
}

/**
 * check & install required dependencies during local debug when selected hosting type is SPFx.
 */
export async function validateSpfxDependenciesHandler(): Promise<void> {
  const nodeChecker = new SPFxNodeChecker(vscodeAdapter, vscodeLogger, vscodeTelemetry);
  const depsChecker = new DepsChecker(vscodeLogger, vscodeAdapter, [nodeChecker]);
  await validateDependenciesCore(depsChecker);
}

async function validateDependenciesCore(depsChecker: DepsChecker): Promise<void> {
  const shouldContinue = await depsChecker.resolve();
  if (!shouldContinue) {
    await debug.stopDebugging();
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
      const backendExtensionsInstaller = new BackendExtensionsInstaller(
        dotnetChecker,
        vscodeLogger
      );

      try {
        await backendExtensionsInstaller.install(backendRoot);
      } catch (error) {
        await DepsChecker.handleErrorWithDisplay(error, vscodeAdapter);
        throw error;
      }
    }
  }
}

/**
 * call localDebug on core
 */
export async function preDebugCheckHandler(): Promise<void> {
  try {
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugPreCheck);
  } catch {
    // ignore telemetry error
  }

  let result: Result<any, FxError> = ok(null);
  result = await runCommand(Stage.debug);
  if (result.isErr()) {
    try {
      ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.DebugPreCheck, result.error);
    } finally {
      // ignore telemetry error
      terminateAllRunningTeamsfxTasks();
      throw result.error;
    }
  }

  const portsInUse = await commonUtils.getPortsInUse();
  if (portsInUse.length > 0) {
    let message: string;
    if (portsInUse.length > 1) {
      message = util.format(
        StringResources.vsc.localDebug.portsAlreadyInUse,
        portsInUse.join(", ")
      );
    } else {
      message = util.format(StringResources.vsc.localDebug.portAlreadyInUse, portsInUse[0]);
    }
    const error = new UserError(ExtensionErrors.PortAlreadyInUse, message, ExtensionSource);
    try {
      ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.DebugPreCheck, error);
    } finally {
      // ignore telemetry error
      window.showErrorMessage(message);
      terminateAllRunningTeamsfxTasks();
      throw error;
    }
  }
}

export async function openDocumentHandler(args: any[]): Promise<boolean> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Documentation, getTriggerFromProperty(args));
  return env.openExternal(Uri.parse("https://aka.ms/build-first-app"));
}

export async function openWelcomeHandler(args?: any[]) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.QuickStart, getTriggerFromProperty(args));
  WebviewPanel.createOrShow(ext.context.extensionPath, PanelType.QuickStart);
}

function getTriggerFromProperty(args?: any[]) {
  const isFromTreeView = args && args.toString() === "TreeView";

  return {
    [TelemetryProperty.TriggerFrom]: isFromTreeView
      ? TelemetryTiggerFrom.TreeView
      : TelemetryTiggerFrom.CommandPalette,
  };
}

async function openMarkdownHandler() {
  const afterScaffold = ext.context.globalState.get("openReadme", false);
  if (afterScaffold && workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    ext.context.globalState.update("openReadme", false);
    const workspaceFolder = workspace.workspaceFolders[0];
    const workspacePath: string = workspaceFolder.uri.fsPath;
    let targetFolder: string | undefined;
    if (await isSPFxProject(workspacePath)) {
      targetFolder = `${workspacePath}/SPFx`;
    } else {
      const tabFolder = await commonUtils.getProjectRoot(
        workspacePath,
        constants.frontendFolderName
      );
      const botFolder = await commonUtils.getProjectRoot(workspacePath, constants.botFolderName);
      if (tabFolder && botFolder) {
        targetFolder = workspacePath;
      } else if (tabFolder) {
        targetFolder = tabFolder;
      } else {
        targetFolder = botFolder;
      }
    }
    const uri = Uri.file(`${targetFolder}/README.md`);
    workspace.openTextDocument(uri).then(() => {
      const PreviewMarkdownCommand = "markdown.showPreviewToSide";
      commands.executeCommand(PreviewMarkdownCommand, uri);
    });
  }
}

export async function openSamplesHandler(args?: any[]) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Samples, getTriggerFromProperty(args));
  WebviewPanel.createOrShow(ext.context.extensionPath, PanelType.SampleGallery);
}

export async function openAppManagement(args?: any[]) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ManageTeamsApp, getTriggerFromProperty(args));
  return env.openExternal(Uri.parse("https://dev.teams.microsoft.com/home"));
}

export async function openBotManagement(args?: any[]) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ManageTeamsBot, getTriggerFromProperty(args));
  return env.openExternal(Uri.parse("https://dev.teams.microsoft.com/bots"));
}

export async function openReportIssues(args?: any[]) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ReportIssues, getTriggerFromProperty(args));
  return env.openExternal(Uri.parse("https://github.com/OfficeDev/TeamsFx/issues"));
}

export async function openManifestHandler(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.OpenManifestEditorStart,
    getTriggerFromProperty(args)
  );
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
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenManifestEditor, {
        [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      });
      return ok(null);
    } else {
      const FxError: FxError = {
        name: "FileNotFound",
        source: ExtensionSource,
        message: util.format(StringResources.vsc.handlers.fileNotFound, manifestFile),
        timestamp: new Date(),
      };
      showError(FxError);
      ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.OpenManifestEditor, FxError);
      return err(FxError);
    }
  } else {
    const FxError: FxError = {
      name: "NoWorkspace",
      source: ExtensionSource,
      message: StringResources.vsc.handlers.noOpenWorkspace,
      timestamp: new Date(),
    };
    showError(FxError);
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.OpenManifestEditor, FxError);
    return err(FxError);
  }
}

export async function openM365AccountHandler() {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenM365Portal);
  return env.openExternal(Uri.parse("https://admin.microsoft.com/Adminportal/"));
}

export async function openAzureAccountHandler() {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenAzurePortal);
  return env.openExternal(Uri.parse("https://portal.azure.com/"));
}

export async function cmdHdlLoadTreeView(context: ExtensionContext) {
  const disposables = TreeViewManagerInstance.registerTreeViews();
  context.subscriptions.push(...disposables);

  // Register SignOut tree view command
  commands.registerCommand("fx-extension.signOut", async (node: TreeViewCommand) => {
    try {
      switch (node.contextValue) {
        case "signedinM365": {
          signOutM365(true);
          break;
        }
        case "signedinAzure": {
          signOutAzure(true);
          break;
        }
      }
    } catch (e) {
      showError(e);
    }
  });

  commands.registerCommand("fx-extension.signInGuideline", async (node: TreeViewCommand) => {
    // TODO: update the link when documentation is ready
    switch (node.contextValue) {
      case "signinM365": {
        await env.openExternal(Uri.parse("https://www.office.com/"));
        break;
      }
      case "signinAzure": {
        await env.openExternal(Uri.parse("https://portal.azure.com/"));
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
  if (isUserCancelError(e)) {
    return;
  } else if (e instanceof UserError && e.helpLink && typeof e.helpLink != "undefined") {
    const help = {
      title: StringResources.vsc.handlers.getHelp,
      run: async (): Promise<void> => {
        commands.executeCommand("vscode.open", Uri.parse(`${e.helpLink}#${e.source}${e.name}`));
      },
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
      },
    };

    const button = await window.showErrorMessage(`[${errorCode}]: ${e.message}`, issue);
    if (button) await button.run();
  } else {
    await window.showErrorMessage(`[${errorCode}]: ${e.message}`);
  }
}

export async function cmpAccountsHandler() {
  const signInAzureOption: VscQuickPickItem = {
    id: "signInAzure",
    label: "Sign in to Azure",
    function: () => signInAzure(),
  };

  const signOutAzureOption: VscQuickPickItem = {
    id: "signOutAzure",
    label: "Sign out of Azure: ",
    function: () => signOutAzure(false),
  };

  const signInM365Option: VscQuickPickItem = {
    id: "signinM365",
    label: "Sign in to M365",
    function: () => signInM365(),
  };

  const signOutM365Option: VscQuickPickItem = {
    id: "signOutM365",
    label: "Sign out of M365: ",
    function: () => signOutM365(false),
  };

  //TODO: hide subscription list until core or api expose the get subscription list API
  // let selectSubscriptionOption: VscQuickPickItem = {
  //   id: "selectSubscription",
  //   label: "Specify an Azure Subscription",
  //   function: () => selectSubscription(),
  //   detail: "4 subscriptions discovered"
  // };

  const quickPick = window.createQuickPick();

  const quickItemOptionArray: VscQuickPickItem[] = [];

  const m365Account = await AppStudioTokenInstance.getStatus();
  if (m365Account.status === "SignedIn") {
    const accountInfo = m365Account.accountInfo;
    const email = (accountInfo as any).upn ? (accountInfo as any).upn : undefined;
    if (email !== undefined) {
      signOutM365Option.label = signOutM365Option.label.concat(email);
    }
    quickItemOptionArray.push(signOutM365Option);
  } else {
    quickItemOptionArray.push(signInM365Option);
  }

  const azureAccount = await AzureAccountManager.getStatus();
  if (azureAccount.status === "SignedIn") {
    const accountInfo = azureAccount.accountInfo;
    const email = (accountInfo as any).upn ? (accountInfo as any).upn : undefined;
    if (email !== undefined) {
      signOutAzureOption.label = signOutAzureOption.label.concat(email);
    }
    quickItemOptionArray.push(signOutAzureOption);
    //quickItemOptionArray.push(selectSubscriptionOption);
  } else {
    quickItemOptionArray.push(signInAzureOption);
  }

  quickPick.items = quickItemOptionArray;
  quickPick.onDidChangeSelection((selection) => {
    if (selection[0]) {
      (selection[0] as VscQuickPickItem).function().catch(console.error);
    }
  });
  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
}

export async function signOutAzure(isFromTreeView: boolean) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SignOutStart, {
    [TelemetryProperty.TriggerFrom]: isFromTreeView
      ? TelemetryTiggerFrom.TreeView
      : TelemetryTiggerFrom.CommandPalette,
    [TelemetryProperty.AccountType]: AccountType.Azure,
  });
  const result = await AzureAccountManager.signout();
  if (result) {
    await TreeViewManagerInstance.getTreeView("teamsfx-accounts")!.refresh([
      {
        commandId: "fx-extension.signinAzure",
        label: StringResources.vsc.handlers.signInAzure,
        contextValue: "signinAzure",
      },
    ]);
    await TreeViewManagerInstance.getTreeView("teamsfx-accounts")!.remove([
      {
        commandId: "fx-extension.selectSubscription",
        label: "",
        parent: "fx-extension.signinAzure",
      },
    ]);
  }
}

export async function signOutM365(isFromTreeView: boolean) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SignOutStart, {
    [TelemetryProperty.TriggerFrom]: isFromTreeView
      ? TelemetryTiggerFrom.TreeView
      : TelemetryTiggerFrom.CommandPalette,
    [TelemetryProperty.AccountType]: AccountType.M365,
  });
  let appstudioLogin: AppStudioTokenProvider = AppStudioTokenInstance;
  const vscodeEnv = detectVsCodeEnv();
  if (vscodeEnv === VsCodeEnv.codespaceBrowser || vscodeEnv === VsCodeEnv.codespaceVsCode) {
    appstudioLogin = AppStudioCodeSpaceTokenInstance;
  }
  const result = await appstudioLogin.signout();
  if (result) {
    await TreeViewManagerInstance.getTreeView("teamsfx-accounts")!.refresh([
      {
        commandId: "fx-extension.signinM365",
        label: StringResources.vsc.handlers.signIn365,
        contextValue: "signinM365",
      },
    ]);
  }
}

export async function signInAzure() {
  vscode.commands.executeCommand("fx-extension.signinAzure");
}

export async function signInM365() {
  vscode.commands.executeCommand("fx-extension.signinM365");
}

export async function selectSubscription() {
  vscode.commands.executeCommand("fx-extension.specifySubscription");
}

export interface VscQuickPickItem extends QuickPickItem {
  /**
   * Current id of the option item.
   */
  id: string;

  function: () => Promise<void>;
}
