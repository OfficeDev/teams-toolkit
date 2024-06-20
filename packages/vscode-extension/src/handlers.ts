// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/* eslint-disable @typescript-eslint/no-floating-promises */

/**
 * @author Huajie Zhang <zhjay23@qq.com>
 */
"use strict";

import {
  AppPackageFolderName,
  BuildFolderName,
  Func,
  FxError,
  Inputs,
  ManifestTemplateFileName,
  ManifestUtil,
  OptionItem,
  Result,
  SelectFileConfig,
  SelectFolderConfig,
  SingleSelectConfig,
  Stage,
  StaticOptions,
  SubscriptionInfo,
  SystemError,
  UserError,
  Void,
  Warning,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import {
  AppStudioScopes,
  AuthSvcScopes,
  CapabilityOptions,
  Correlator,
  DepsManager,
  DepsType,
  Hub,
  InvalidProjectError,
  JSONSyntaxError,
  MetadataV3,
  QuestionNames,
  askSubscription,
  assembleError,
  environmentManager,
  generateScaffoldingSummary,
  getHashedEnv,
  globalStateGet,
  globalStateUpdate,
  isUserCancelError,
  isValidProject,
  manifestUtils,
  pathUtils,
  pluginManifestUtils,
  teamsDevPortalClient,
} from "@microsoft/teamsfx-core";
import * as fs from "fs-extra";
import * as path from "path";
import * as util from "util";
import * as vscode from "vscode";
import { ExtensionContext, QuickPickItem, Uri, commands, env, window, workspace } from "vscode";
import azureAccountManager from "./commonlib/azureLogin";
import VsCodeLogInstance from "./commonlib/log";
import M365TokenInstance from "./commonlib/m365Login";
import { AzurePortalUrl, CommandKey, GlobalKey } from "./constants";
import { PanelType } from "./controls/PanelType";
import { WebviewPanel } from "./controls/webviewPanel";
import { checkPrerequisitesForGetStarted } from "./debug/depsChecker/getStartedChecker";
import { vscodeLogger } from "./debug/depsChecker/vscodeLogger";
import { vscodeTelemetry } from "./debug/depsChecker/vscodeTelemetry";
import { openHubWebClient } from "./debug/launch";
import { selectAndDebug } from "./debug/runIconHandler";
import { showError, wrapError } from "./error/common";
import { ExtensionErrors, ExtensionSource } from "./error/error";
import { TreatmentVariableValue } from "./exp/treatmentVariables";
import {
  core,
  isOfficeAddInProject,
  isSPFxProject,
  isTeamsFxProject,
  tools,
  workspaceUri,
} from "./globalVariables";
import { createNewProjectHandler } from "./handlers/lifecycleHandlers";
import { openWelcomeHandler } from "./handlers/openLinkHandlers";
import { processResult, runCommand } from "./handlers/sharedOpts";
import { TeamsAppMigrationHandler } from "./migration/migrationHandler";
import { VS_CODE_UI } from "./qm/vsc_ui";
import { ExtTelemetry } from "./telemetry/extTelemetry";
import {
  AccountType,
  InProductGuideInteraction,
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
  TelemetryTriggerFrom,
  TelemetryUpdateAppReason,
} from "./telemetry/extTelemetryEvents";
import accountTreeViewProviderInstance from "./treeview/account/accountTreeViewProvider";
import { AzureAccountNode } from "./treeview/account/azureNode";
import { AccountItemStatus } from "./treeview/account/common";
import { M365AccountNode } from "./treeview/account/m365Node";
import envTreeProviderInstance from "./treeview/environmentTreeViewProvider";
import { TreeViewCommand } from "./treeview/treeViewCommand";
import TreeViewManagerInstance from "./treeview/treeViewManager";
import { getAppName } from "./utils/appDefinitionUtils";
import {
  checkCoreNotEmpty,
  getLocalDebugMessageTemplate,
  openFolderInExplorer,
} from "./utils/commonUtils";
import { getResourceGroupNameFromEnv, getSubscriptionInfoFromEnv } from "./utils/envTreeUtils";
import { getDefaultString, localize } from "./utils/localizeUtils";
import { triggerV3Migration } from "./utils/migrationUtils";
import { updateProjectStatus } from "./utils/projectStatusUtils";
import { ExtensionSurvey } from "./utils/survey";
import { getSystemInputs } from "./utils/systemEnvUtils";
import { getTriggerFromProperty, isTriggerFromWalkThrough } from "./utils/telemetryUtils";

export async function selectAndDebugHandler(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.RunIconDebugStart, getTriggerFromProperty(args));
  const result = await selectAndDebug();
  await processResult(TelemetryEvent.RunIconDebug, result);
  return result;
}

export async function treeViewLocalDebugHandler(): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.TreeViewLocalDebug);
  await vscode.commands.executeCommand("workbench.action.quickOpen", "debug ");

  return ok(null);
}

export async function treeViewPreviewHandler(...args: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.TreeViewPreviewStart,
    getTriggerFromProperty(args)
  );
  const properties: { [key: string]: string } = {};

  try {
    const env = args[1]?.identifier as string;
    const inputs = getSystemInputs();
    inputs.env = env;
    properties[TelemetryProperty.Env] = env;

    const result = await core.previewWithManifest(inputs);
    if (result.isErr()) {
      throw result.error;
    }

    const hub = inputs[QuestionNames.M365Host] as Hub;
    const url = result.value;
    properties[TelemetryProperty.Hub] = hub;

    await openHubWebClient(hub, url);
  } catch (error) {
    const assembledError = assembleError(error);
    void showError(assembledError);
    ExtTelemetry.sendTelemetryErrorEvent(
      TelemetryEvent.TreeViewPreview,
      assembledError,
      properties
    );
    return err(assembledError);
  }

  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.TreeViewPreview, {
    [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    ...properties,
  });
  return ok(null);
}

export async function validateManifestHandler(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.ValidateManifestStart,
    getTriggerFromProperty(args)
  );

  const inputs = getSystemInputs();
  return await runCommand(Stage.validateApplication, inputs);
}

/**
 * Ask user to select environment, local is included
 */
export async function askTargetEnvironment(): Promise<Result<string, FxError>> {
  const projectPath = workspaceUri?.fsPath;
  if (!isValidProject(projectPath)) {
    return err(new InvalidProjectError());
  }
  const envProfilesResult = await environmentManager.listAllEnvConfigs(projectPath!);
  if (envProfilesResult.isErr()) {
    return err(envProfilesResult.error);
  }
  const config: SingleSelectConfig = {
    name: "targetEnvName",
    title: "Select an environment",
    options: envProfilesResult.value,
  };
  const selectedEnv = await VS_CODE_UI.selectOption(config);
  if (selectedEnv.isErr()) {
    return err(selectedEnv.error);
  } else {
    return ok(selectedEnv.value.result as string);
  }
}

export async function buildPackageHandler(...args: unknown[]): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.BuildStart, getTriggerFromProperty(args));
  return await runCommand(Stage.createAppPackage);
}

let lastAppPackageFile: string | undefined;

export async function publishInDeveloperPortalHandler(
  ...args: unknown[]
): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.PublishInDeveloperPortalStart,
    getTriggerFromProperty(args)
  );
  const workspacePath = workspaceUri?.fsPath;
  const zipDefaultFolder: string | undefined = path.join(
    workspacePath!,
    BuildFolderName,
    AppPackageFolderName
  );

  let files: string[] = [];
  if (await fs.pathExists(zipDefaultFolder)) {
    files = await fs.readdir(zipDefaultFolder);
    files = files
      .filter((file) => path.extname(file).toLowerCase() === ".zip")
      .map((file) => {
        return path.join(zipDefaultFolder, file);
      });
  }
  while (true) {
    const selectFileConfig: SelectFileConfig = {
      name: "appPackagePath",
      title: localize("teamstoolkit.publishInDevPortal.selectFile.title"),
      placeholder: localize("teamstoolkit.publishInDevPortal.selectFile.placeholder"),
      filters: {
        "Zip files": ["zip"],
      },
    };
    if (lastAppPackageFile && fs.existsSync(lastAppPackageFile)) {
      selectFileConfig.default = lastAppPackageFile;
    } else {
      selectFileConfig.possibleFiles = files.map((file) => {
        const appPackageFilename = path.basename(file);
        const appPackageFilepath = path.dirname(file);
        return {
          id: file,
          label: `$(file) ${appPackageFilename}`,
          description: appPackageFilepath,
        };
      });
    }
    const selectFileResult = await VS_CODE_UI.selectFile(selectFileConfig);
    if (selectFileResult.isErr()) {
      ExtTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.PublishInDeveloperPortal,
        selectFileResult.error,
        getTriggerFromProperty(args)
      );
      return ok(null);
    }
    if (
      (lastAppPackageFile && selectFileResult.value.result === lastAppPackageFile) ||
      (!lastAppPackageFile && files.indexOf(selectFileResult.value.result!) !== -1)
    ) {
      // user selected file in options
      lastAppPackageFile = selectFileResult.value.result;
      break;
    }
    // final confirmation
    lastAppPackageFile = selectFileResult.value.result!;
    const appPackageFilename = path.basename(lastAppPackageFile);
    const appPackageFilepath = path.dirname(lastAppPackageFile);
    const confirmOption: SingleSelectConfig = {
      options: [
        {
          id: "yes",
          label: `$(file) ${appPackageFilename}`,
          description: appPackageFilepath,
        },
      ],
      name: "confirm",
      title: localize("teamstoolkit.publishInDevPortal.selectFile.title"),
      placeholder: localize("teamstoolkit.publishInDevPortal.confirmFile.placeholder"),
      step: 2,
    };
    const confirm = await VS_CODE_UI.selectOption(confirmOption);
    if (confirm.isErr()) {
      ExtTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.PublishInDeveloperPortal,
        confirm.error,
        getTriggerFromProperty(args)
      );
      return ok(null);
    }
    if (confirm.value.type === "success") {
      break;
    }
  }
  const inputs = getSystemInputs();
  inputs["appPackagePath"] = lastAppPackageFile;
  const res = await runCommand(Stage.publishInDeveloperPortal, inputs);
  if (res.isErr()) {
    ExtTelemetry.sendTelemetryErrorEvent(
      TelemetryEvent.PublishInDeveloperPortal,
      res.error,
      getTriggerFromProperty(args)
    );
  }
  return res;
}

export function openFolderHandler(...args: unknown[]): Promise<Result<unknown, FxError>> {
  const scheme = "file://";
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenFolder, {
    [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Notification,
  });
  if (args && args.length > 0 && args[0]) {
    let path = args[0] as string;
    if (path.startsWith(scheme)) {
      path = path.substring(scheme.length);
    }
    const uri = Uri.file(path);
    openFolderInExplorer(uri.fsPath);
  }
  return Promise.resolve(ok(null));
}

export async function addWebpart(...args: unknown[]) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.AddWebpartStart, getTriggerFromProperty(args));

  return await runCommand(Stage.addWebpart);
}

export async function validateAzureDependenciesHandler(): Promise<string | undefined> {
  try {
    await triggerV3Migration();
    return undefined;
  } catch (error: any) {
    void showError(error as FxError);
    return "1";
  }
}

/**
 * Check & install required local prerequisites before local debug.
 */
export async function validateLocalPrerequisitesHandler(): Promise<string | undefined> {
  try {
    await triggerV3Migration();
    return undefined;
  } catch (error: any) {
    void showError(error as FxError);
    return "1";
  }
}

/*
 * Prompt window to let user install the app in Teams
 */
export async function installAppInTeams(): Promise<string | undefined> {
  try {
    await triggerV3Migration();
    return undefined;
  } catch (error: any) {
    void showError(error as FxError);
    return "1";
  }
}

/**
 * Check required prerequisites in Get Started Page.
 */
export async function validateGetStartedPrerequisitesHandler(
  ...args: unknown[]
): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.ClickValidatePrerequisites,
    getTriggerFromProperty(args)
  );
  const result = await checkPrerequisitesForGetStarted();
  if (result.isErr()) {
    void showError(result.error);
    // // return non-zero value to let task "exit ${command:xxx}" to exit
    // return "1";
  }
  return result;
}

/**
 * install functions binding before launch local debug
 */
export async function backendExtensionsInstallHandler(): Promise<string | undefined> {
  try {
    await triggerV3Migration();
    return undefined;
  } catch (error: any) {
    void showError(error as FxError);
    return "1";
  }
}

/**
 * Get path delimiter
 * Usage like ${workspaceFolder}/devTools/func${command:...}${env:PATH}
 */
export function getPathDelimiterHandler(): string {
  return path.delimiter;
}

/**
 * Get dotnet path to be referenced by task definition.
 * Usage like ${command:...}${env:PATH} so need to include delimiter as well
 */
export async function getDotnetPathHandler(): Promise<string> {
  try {
    const depsManager = new DepsManager(vscodeLogger, vscodeTelemetry);
    const dotnetStatus = (await depsManager.getStatus([DepsType.Dotnet]))?.[0];
    if (dotnetStatus?.isInstalled && dotnetStatus?.details?.binFolders !== undefined) {
      return `${path.delimiter}${dotnetStatus.details.binFolders
        .map((f: string) => path.dirname(f))
        .join(path.delimiter)}${path.delimiter}`;
    }
  } catch (error: any) {
    void showError(assembleError(error));
  }

  return `${path.delimiter}`;
}

/**
 * call localDebug on core
 */
export async function preDebugCheckHandler(): Promise<string | undefined> {
  try {
    await triggerV3Migration();
    return undefined;
  } catch (error: any) {
    void showError(error as FxError);
    return "1";
  }
}

export async function createAccountHandler(args: any[]): Promise<void> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CreateAccountStart, getTriggerFromProperty(args));
  const m365Option: OptionItem = {
    id: "createAccountM365",
    label: `$(add) ${localize("teamstoolkit.commands.createAccount.m365")}`,
    description: localize("teamstoolkit.commands.createAccount.requireSubscription"),
  };
  const azureOption: OptionItem = {
    id: "createAccountAzure",
    label: `$(add) ${localize("teamstoolkit.commands.createAccount.azure")}`,
    description: localize("teamstoolkit.commands.createAccount.free"),
  };
  const option: SingleSelectConfig = {
    name: "CreateAccounts",
    title: localize("teamstoolkit.commands.createAccount.title"),
    options: [m365Option, azureOption],
  };
  const result = await VS_CODE_UI.selectOption(option);
  if (result.isOk()) {
    if (result.value.result === m365Option.id) {
      await VS_CODE_UI.openUrl("https://developer.microsoft.com/microsoft-365/dev-program");
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CreateAccount, {
        [TelemetryProperty.AccountType]: AccountType.M365,
        ...getTriggerFromProperty(args),
      });
    } else if (result.value.result === azureOption.id) {
      await VS_CODE_UI.openUrl("https://azure.microsoft.com/en-us/free/");
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CreateAccount, {
        [TelemetryProperty.AccountType]: AccountType.Azure,
        ...getTriggerFromProperty(args),
      });
    }
  } else {
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CreateAccount, result.error, {
      ...getTriggerFromProperty(args),
    });
  }
  return;
}

export async function openBuildIntelligentAppsWalkthroughHandler(
  ...args: unknown[]
): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.WalkThroughBuildIntelligentApps,
    getTriggerFromProperty(args)
  );
  const data = await vscode.commands.executeCommand(
    "workbench.action.openWalkthrough",
    "TeamsDevApp.ms-teams-vscode-extension#buildIntelligentApps"
  );
  return Promise.resolve(ok(data));
}

export async function checkUpgrade(args?: any[]) {
  const triggerFrom = getTriggerFromProperty(args);
  const input = getSystemInputs();
  if (triggerFrom?.[TelemetryProperty.TriggerFrom] === TelemetryTriggerFrom.Auto) {
    input["isNonmodalMessage"] = true;
    // not await here to avoid blocking the UI.
    void core.phantomMigrationV3(input).then((result) => {
      if (result.isErr()) {
        void showError(result.error);
      }
    });
    return;
  } else if (
    triggerFrom[TelemetryProperty.TriggerFrom] &&
    (triggerFrom[TelemetryProperty.TriggerFrom] === TelemetryTriggerFrom.SideBar ||
      triggerFrom[TelemetryProperty.TriggerFrom] === TelemetryTriggerFrom.CommandPalette)
  ) {
    input["skipUserConfirm"] = true;
  }
  const result = await core.phantomMigrationV3(input);
  if (result.isErr()) {
    void showError(result.error);
  }
}

export async function openSurveyHandler(args?: any[]) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Survey, {
    ...getTriggerFromProperty(args),
    // eslint-disable-next-line no-secrets/no-secrets
    message: getDefaultString("teamstoolkit.commandsTreeViewProvider.openSurveyTitle"),
  });
  const survey = ExtensionSurvey.getInstance();
  await survey.openSurveyLink();
}

export async function autoOpenProjectHandler(): Promise<void> {
  const isOpenWalkThrough = (await globalStateGet(GlobalKey.OpenWalkThrough, false)) as boolean;
  const isOpenReadMe = (await globalStateGet(GlobalKey.OpenReadMe, "")) as string;
  const isOpenSampleReadMe = (await globalStateGet(GlobalKey.OpenSampleReadMe, false)) as boolean;
  const createWarnings = (await globalStateGet(GlobalKey.CreateWarnings, "")) as string;
  const autoInstallDependency = (await globalStateGet(GlobalKey.AutoInstallDependency)) as boolean;
  if (isOpenWalkThrough) {
    await showLocalDebugMessage();
    await openWelcomeHandler([TelemetryTriggerFrom.Auto]);
    await globalStateUpdate(GlobalKey.OpenWalkThrough, false);

    if (workspaceUri?.fsPath) {
      await ShowScaffoldingWarningSummary(workspaceUri.fsPath, createWarnings);
      await globalStateUpdate(GlobalKey.CreateWarnings, "");
    }
  }
  if (isOpenReadMe === workspaceUri?.fsPath) {
    await showLocalDebugMessage();
    await openReadMeHandler(TelemetryTriggerFrom.Auto);
    await updateProjectStatus(workspaceUri.fsPath, CommandKey.OpenReadMe, ok(null));
    await globalStateUpdate(GlobalKey.OpenReadMe, "");

    await ShowScaffoldingWarningSummary(workspaceUri.fsPath, createWarnings);
    await globalStateUpdate(GlobalKey.CreateWarnings, "");
  }
  if (isOpenSampleReadMe) {
    await showLocalDebugMessage();
    await openSampleReadmeHandler([TelemetryTriggerFrom.Auto]);
    await globalStateUpdate(GlobalKey.OpenSampleReadMe, false);
  }
  if (autoInstallDependency) {
    await autoInstallDependencyHandler();
    await globalStateUpdate(GlobalKey.AutoInstallDependency, false);
  }
}

export async function openReadMeHandler(...args: unknown[]) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ClickOpenReadMe, getTriggerFromProperty(args));
  if (!isTeamsFxProject && !isOfficeAddInProject) {
    const createProject = {
      title: localize("teamstoolkit.handlers.createProjectTitle"),
      run: async (): Promise<void> => {
        await Correlator.run(
          async () => await createNewProjectHandler(TelemetryTriggerFrom.Notification)
        );
      },
    };

    const openFolder = {
      title: localize("teamstoolkit.handlers.openFolderTitle"),
      run: async (): Promise<void> => {
        await commands.executeCommand("vscode.openFolder");
      },
    };

    void vscode.window
      .showInformationMessage(
        localize("teamstoolkit.handlers.createProjectNotification"),
        createProject,
        openFolder
      )
      .then((selection) => {
        selection?.run();
      });
  } else if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const workspaceFolder = workspace.workspaceFolders[0];
    const workspacePath: string = workspaceFolder.uri.fsPath;
    // show README.md or src/README.md(SPFx) in workspace root folder
    const rootReadmePath = `${workspacePath}/README.md`;
    const uri = (await fs.pathExists(rootReadmePath))
      ? Uri.file(rootReadmePath)
      : Uri.file(`${workspacePath}/src/README.md`);

    if (TreatmentVariableValue.inProductDoc) {
      const content = await fs.readFile(uri.fsPath, "utf8");
      if (content.includes("## Get Started with the Notification bot")) {
        // A notification bot project.
        if (content.includes("restify")) {
          // Restify server notification bot.
          ExtTelemetry.sendTelemetryEvent(TelemetryEvent.InteractWithInProductDoc, {
            [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Auto,
            [TelemetryProperty.Interaction]: InProductGuideInteraction.Open,
            [TelemetryProperty.Identifier]: PanelType.RestifyServerNotificationBotReadme,
          });
          WebviewPanel.createOrShow(PanelType.RestifyServerNotificationBotReadme);
        } else {
          ExtTelemetry.sendTelemetryEvent(TelemetryEvent.InteractWithInProductDoc, {
            [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Auto,
            [TelemetryProperty.Interaction]: InProductGuideInteraction.Open,
            [TelemetryProperty.Identifier]: PanelType.FunctionBasedNotificationBotReadme,
          });
          WebviewPanel.createOrShow(PanelType.FunctionBasedNotificationBotReadme);
        }
      }
    }

    // Always open README.md in current panel instead of side-by-side.
    await workspace.openTextDocument(uri);
    const PreviewMarkdownCommand = "markdown.showPreview";
    await vscode.commands.executeCommand(PreviewMarkdownCommand, uri);
  }
  return ok<unknown, FxError>(null);
}

export async function openSampleReadmeHandler(args?: any) {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const workspaceFolder = workspace.workspaceFolders[0];
    const workspacePath: string = workspaceFolder.uri.fsPath;
    const uri = Uri.file(`${workspacePath}/README.md`);
    await workspace.openTextDocument(uri);
    if (isTriggerFromWalkThrough(args as unknown[])) {
      const PreviewMarkdownCommand = "markdown.showPreviewToSide";
      await commands.executeCommand(PreviewMarkdownCommand, uri);
    } else {
      const PreviewMarkdownCommand = "markdown.showPreview";
      await commands.executeCommand(PreviewMarkdownCommand, uri);
    }
  }
}

export async function autoInstallDependencyHandler() {
  await VS_CODE_UI.runCommand({
    cmd: "npm i",
    workingDirectory: "${workspaceFolder}/src",
    shellName: localize("teamstoolkit.handlers.autoInstallDependency"),
    iconPath: "cloud-download",
  });
}

export async function showLocalDebugMessage() {
  const shouldShowLocalDebugMessage = (await globalStateGet(
    GlobalKey.ShowLocalDebugMessage,
    false
  )) as boolean;

  if (!shouldShowLocalDebugMessage) {
    return;
  } else {
    await globalStateUpdate(GlobalKey.ShowLocalDebugMessage, false);
  }

  const hasLocalEnv = await fs.pathExists(path.join(workspaceUri!.fsPath, "teamsapp.local.yml"));

  const appName = (await getAppName()) ?? localize("teamstoolkit.handlers.fallbackAppName");
  const isWindows = process.platform === "win32";
  const folderLink = encodeURI(workspaceUri!.toString());
  const openFolderCommand = `command:fx-extension.openFolder?%5B%22${folderLink}%22%5D`;

  if (hasLocalEnv) {
    const localDebug = {
      title: localize("teamstoolkit.handlers.localDebugTitle"),
      run: async (): Promise<void> => {
        await selectAndDebug();
      },
    };
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ShowLocalDebugNotification);

    const messageTemplate = await getLocalDebugMessageTemplate(isWindows);

    let message = util.format(messageTemplate, appName, workspaceUri?.fsPath);
    if (isWindows) {
      message = util.format(messageTemplate, appName, openFolderCommand);
    }
    void vscode.window.showInformationMessage(message, localDebug).then((selection) => {
      if (selection?.title === localize("teamstoolkit.handlers.localDebugTitle")) {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ClickLocalDebug);
        selection.run();
      }
    });
  } else {
    const provision = {
      title: localize("teamstoolkit.handlers.provisionTitle"),
      run: async (): Promise<void> => {
        await vscode.commands.executeCommand(CommandKey.Provision, [
          TelemetryTriggerFrom.Notification,
        ]);
      },
    };
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ShowProvisionNotification);
    const message = isWindows
      ? util.format(
          localize("teamstoolkit.handlers.provisionDescription"),
          appName,
          openFolderCommand
        )
      : util.format(
          localize("teamstoolkit.handlers.provisionDescription.fallback"),
          appName,
          workspaceUri?.fsPath
        );
    void vscode.window.showInformationMessage(message, provision).then((selection) => {
      if (selection?.title === localize("teamstoolkit.handlers.provisionTitle")) {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ClickProvision);
        selection.run();
      }
    });
  }
}

export async function ShowScaffoldingWarningSummary(
  workspacePath: string,
  warning: string
): Promise<void> {
  try {
    let createWarnings: Warning[] = [];

    if (warning) {
      try {
        createWarnings = JSON.parse(warning) as Warning[];
      } catch (e) {
        const error = new JSONSyntaxError(warning, e, "vscode");
        ExtTelemetry.sendTelemetryErrorEvent(
          TelemetryEvent.ShowScaffoldingWarningSummaryError,
          error
        );
      }
    }
    const manifestRes = await manifestUtils._readAppManifest(
      path.join(workspacePath, AppPackageFolderName, ManifestTemplateFileName)
    );
    let message;
    if (manifestRes.isOk()) {
      const teamsManifest = manifestRes.value;
      const commonProperties = ManifestUtil.parseCommonProperties(teamsManifest);
      if (commonProperties.capabilities.includes("plugin")) {
        const apiSpecFilePathRes = await pluginManifestUtils.getApiSpecFilePathFromTeamsManifest(
          teamsManifest,
          path.join(workspacePath, AppPackageFolderName, ManifestTemplateFileName)
        );
        if (apiSpecFilePathRes.isErr()) {
          ExtTelemetry.sendTelemetryErrorEvent(
            TelemetryEvent.ShowScaffoldingWarningSummaryError,
            apiSpecFilePathRes.error
          );
        } else {
          message = generateScaffoldingSummary(
            createWarnings,
            teamsManifest,
            path.relative(workspacePath, apiSpecFilePathRes.value[0])
          );
        }
      }
      if (commonProperties.isApiME) {
        message = generateScaffoldingSummary(
          createWarnings,
          manifestRes.value,
          teamsManifest.composeExtensions?.[0].apiSpecificationFile ?? ""
        );
      }

      if (message) {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ShowScaffoldingWarningSummary);
        VsCodeLogInstance.outputChannel.show();
        void VsCodeLogInstance.info(message);
      }
    } else {
      ExtTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.ShowScaffoldingWarningSummaryError,
        manifestRes.error
      );
    }
  } catch (e) {
    const error = assembleError(e);
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.ShowScaffoldingWarningSummaryError, error);
  }
}

export async function openSamplesHandler(...args: unknown[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Samples, getTriggerFromProperty(args));
  WebviewPanel.createOrShow(PanelType.SampleGallery, args);
  return Promise.resolve(ok(null));
}

export async function openExternalHandler(args?: any[]) {
  if (args && args.length > 0) {
    const url = (args[0] as { url: string }).url;
    return env.openExternal(Uri.parse(url));
  }
}

export async function createNewEnvironment(args?: any[]): Promise<Result<undefined, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CreateNewEnvironmentStart,
    getTriggerFromProperty(args)
  );
  const result = await runCommand(Stage.createEnv);
  if (!result.isErr()) {
    await envTreeProviderInstance.reloadEnvironments();
  }
  return result;
}

export async function refreshEnvironment(args?: any[]): Promise<Result<Void, FxError>> {
  return await envTreeProviderInstance.reloadEnvironments();
}

function getSubscriptionUrl(subscriptionInfo: SubscriptionInfo): string {
  const subscriptionId = subscriptionInfo.subscriptionId;
  const tenantId = subscriptionInfo.tenantId;

  return `${AzurePortalUrl}/#@${tenantId}/resource/subscriptions/${subscriptionId}`;
}

enum ResourceInfo {
  Subscription = "Subscription",
  ResourceGroup = "Resource Group",
}

export async function openSubscriptionInPortal(env: string): Promise<Result<Void, FxError>> {
  const telemetryProperties: { [p: string]: string } = {};
  telemetryProperties[TelemetryProperty.Env] = getHashedEnv(env);

  const subscriptionInfo = await getSubscriptionInfoFromEnv(env);
  if (subscriptionInfo) {
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenSubscriptionInPortal, telemetryProperties);

    const url = getSubscriptionUrl(subscriptionInfo);
    await vscode.env.openExternal(vscode.Uri.parse(url));

    return ok(Void);
  } else {
    const resourceInfoNotFoundError = new UserError(
      ExtensionSource,
      ExtensionErrors.EnvResourceInfoNotFoundError,
      util.format(
        localize("teamstoolkit.handlers.resourceInfoNotFound"),
        ResourceInfo.Subscription,
        env
      )
    );
    ExtTelemetry.sendTelemetryErrorEvent(
      TelemetryEvent.OpenSubscriptionInPortal,
      resourceInfoNotFoundError,
      telemetryProperties
    );

    return err(resourceInfoNotFoundError);
  }
}

export async function openResourceGroupInPortal(env: string): Promise<Result<Void, FxError>> {
  const telemetryProperties: { [p: string]: string } = {};
  telemetryProperties[TelemetryProperty.Env] = getHashedEnv(env);

  const subscriptionInfo = await getSubscriptionInfoFromEnv(env);
  const resourceGroupName = await getResourceGroupNameFromEnv(env);

  if (subscriptionInfo && resourceGroupName) {
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenResourceGroupInPortal, telemetryProperties);

    const url = `${getSubscriptionUrl(subscriptionInfo)}/resourceGroups/${resourceGroupName}`;
    await vscode.env.openExternal(vscode.Uri.parse(url));

    return ok(Void);
  } else {
    let errorMessage = "";
    if (subscriptionInfo) {
      errorMessage = util.format(
        localize("teamstoolkit.handlers.resourceInfoNotFound"),
        ResourceInfo.ResourceGroup,
        env
      );
    } else if (resourceGroupName) {
      errorMessage = util.format(
        localize("teamstoolkit.handlers.resourceInfoNotFound"),
        ResourceInfo.Subscription,
        env
      );
    } else {
      errorMessage = util.format(
        localize("teamstoolkit.handlers.resourceInfoNotFound"),
        `${ResourceInfo.Subscription} and ${ResourceInfo.ResourceGroup}`,
        env
      );
    }

    const resourceInfoNotFoundError = new UserError(
      ExtensionSource,
      ExtensionErrors.EnvResourceInfoNotFoundError,
      errorMessage
    );
    ExtTelemetry.sendTelemetryErrorEvent(
      TelemetryEvent.OpenSubscriptionInPortal,
      resourceInfoNotFoundError,
      telemetryProperties
    );

    return err(resourceInfoNotFoundError);
  }
}

export async function grantPermission(env?: string): Promise<Result<any, FxError>> {
  let result: Result<any, FxError> = ok(Void);
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.GrantPermissionStart);

  let inputs: Inputs | undefined;
  try {
    const checkCoreRes = checkCoreNotEmpty();
    if (checkCoreRes.isErr()) {
      throw checkCoreRes.error;
    }

    inputs = getSystemInputs();
    inputs.env = env;
    result = await core.grantPermission(inputs);
    if (result.isErr()) {
      throw result.error;
    }
    const grantSucceededMsg = util.format(
      localize("teamstoolkit.handlers.grantPermissionSucceededV3"),
      inputs.email
    );

    window.showInformationMessage(grantSucceededMsg);
    VsCodeLogInstance.info(grantSucceededMsg);
  } catch (e) {
    result = wrapError(e);
  }

  await processResult(TelemetryEvent.GrantPermission, result, inputs);
  return result;
}

export async function listCollaborator(env?: string): Promise<Result<any, FxError>> {
  let result: Result<any, FxError> = ok(Void);
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ListCollaboratorStart);

  let inputs: Inputs | undefined;
  try {
    const checkCoreRes = checkCoreNotEmpty();
    if (checkCoreRes.isErr()) {
      throw checkCoreRes.error;
    }

    inputs = getSystemInputs();
    inputs.env = env;

    result = await core.listCollaborator(inputs);
    if (result.isErr()) {
      throw result.error;
    }

    // TODO: For short-term workaround. Remove after webview is ready.
    VsCodeLogInstance.outputChannel.show();
  } catch (e) {
    result = wrapError(e);
  }

  await processResult(TelemetryEvent.ListCollaborator, result, inputs);
  return result;
}

export async function manageCollaboratorHandler(env?: string): Promise<Result<any, FxError>> {
  let result: any = ok(Void);
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ManageCollaboratorStart);

  try {
    const collaboratorCommandSelection: SingleSelectConfig = {
      name: "collaborationCommand",
      title: localize("teamstoolkit.manageCollaborator.command"),
      options: [
        {
          id: "grantPermission",
          label: localize("teamstoolkit.manageCollaborator.grantPermission.label"),
          detail: localize("teamstoolkit.manageCollaborator.grantPermission.description"),
        },
        {
          id: "listCollaborator",
          label: localize("teamstoolkit.manageCollaborator.listCollaborator.label"),
          detail: localize("teamstoolkit.manageCollaborator.listCollaborator.description"),
        },
      ],
      returnObject: false,
    };
    const collaboratorCommand = await VS_CODE_UI.selectOption(collaboratorCommandSelection);
    if (collaboratorCommand.isErr()) {
      throw collaboratorCommand.error;
    }

    const command = collaboratorCommand.value.result;
    switch (command) {
      case "grantPermission":
        result = await grantPermission(env);
        break;

      case "listCollaborator":
      default:
        result = await listCollaborator(env);
        break;
    }
  } catch (e) {
    result = wrapError(e);
  }

  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ManageCollaborator);
  return result;
}

export function saveTextDocumentHandler(document: vscode.TextDocumentWillSaveEvent) {
  if (!isValidProject(workspaceUri?.fsPath)) {
    return;
  }

  let reason: TelemetryUpdateAppReason | undefined = undefined;
  switch (document.reason) {
    case vscode.TextDocumentSaveReason.Manual:
      reason = TelemetryUpdateAppReason.Manual;
      break;
    case vscode.TextDocumentSaveReason.AfterDelay:
      reason = TelemetryUpdateAppReason.AfterDelay;
      break;
    case vscode.TextDocumentSaveReason.FocusOut:
      reason = TelemetryUpdateAppReason.FocusOut;
      break;
  }

  let curDirectory = path.dirname(document.document.fileName);
  while (curDirectory) {
    if (isValidProject(curDirectory)) {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.UpdateTeamsApp, {
        [TelemetryProperty.UpdateTeamsAppReason]: reason,
      });
      return;
    }

    if (curDirectory === path.join(curDirectory, "..")) {
      break;
    }
    curDirectory = path.join(curDirectory, "..");
  }
}

export function registerAccountMenuCommands(context: ExtensionContext) {
  // Register SignOut tree view command
  context.subscriptions.push(
    commands.registerCommand("fx-extension.signOut", async (node: TreeViewCommand) => {
      try {
        switch (node.contextValue) {
          case "signedinM365": {
            await Correlator.run(async () => {
              await signOutM365(true);
            });
            break;
          }
          case "signedinAzure": {
            await Correlator.run(async () => {
              await signOutAzure(true);
            });
            break;
          }
        }
      } catch (e) {
        void showError(e as FxError);
      }
    })
  );
}

export function cmdHdlDisposeTreeView() {
  TreeViewManagerInstance.dispose();
}

export async function cmpAccountsHandler(args: any[]) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ManageAccount, getTriggerFromProperty(args));
  const signInAzureOption: VscQuickPickItem = {
    id: "signInAzure",
    label: localize("teamstoolkit.handlers.signInAzure"),
    function: () => signInAzure(),
  };

  const signOutAzureOption: VscQuickPickItem = {
    id: "signOutAzure",
    label: localize("teamstoolkit.handlers.signOutOfAzure"),
    function: async () =>
      await Correlator.run(async () => {
        await signOutAzure(false);
      }),
  };

  const signInM365Option: VscQuickPickItem = {
    id: "signinM365",
    label: localize("teamstoolkit.handlers.signIn365"),
    function: () => signInM365(),
  };

  const signOutM365Option: VscQuickPickItem = {
    id: "signOutM365",
    label: localize("teamstoolkit.handlers.signOutOfM365"),
    function: async () =>
      await Correlator.run(async () => {
        await signOutM365(false);
      }),
  };

  const createAccountsOption: VscQuickPickItem = {
    id: "createAccounts",
    label: `$(add) ${localize("teamstoolkit.commands.createAccount.title")}`,
    function: async () => {
      await Correlator.run(() => createAccountHandler([]));
    },
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

  const m365AccountRes = await M365TokenInstance.getStatus({ scopes: AppStudioScopes });
  const m365Account = m365AccountRes.isOk() ? m365AccountRes.value : undefined;
  if (m365Account && m365Account.status === "SignedIn") {
    const accountInfo = m365Account.accountInfo;
    const email = (accountInfo as any).upn ? (accountInfo as any).upn : undefined;
    if (email !== undefined) {
      signOutM365Option.label = signOutM365Option.label.concat(email);
    }
    quickItemOptionArray.push(signOutM365Option);
  } else {
    quickItemOptionArray.push(signInM365Option);
  }

  const azureAccount = await azureAccountManager.getStatus();
  if (azureAccount.status === "SignedIn") {
    const accountInfo = azureAccount.accountInfo;
    const email = (accountInfo as any).email || (accountInfo as any).upn;
    if (email !== undefined) {
      signOutAzureOption.label = signOutAzureOption.label.concat(email);
    }
    quickItemOptionArray.push(signOutAzureOption);
  } else {
    quickItemOptionArray.push(signInAzureOption);
  }

  quickItemOptionArray.push(createAccountsOption);
  quickPick.items = quickItemOptionArray;
  quickPick.onDidChangeSelection((selection) => {
    if (selection[0]) {
      (selection[0] as VscQuickPickItem).function().catch(console.error);
      quickPick.hide();
    }
  });
  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
}

export async function decryptSecret(cipher: string, selection: vscode.Range): Promise<void> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.EditSecretStart, {
    [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Other,
  });
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const inputs = getSystemInputs();
  const result = await core.decrypt(cipher, inputs);
  if (result.isOk()) {
    const editedSecret = await VS_CODE_UI.inputText({
      name: "Secret Editor",
      title: localize("teamstoolkit.handlers.editSecretTitle"),
      default: result.value,
    });
    if (editedSecret.isOk() && editedSecret.value.result) {
      const newCiphertext = await core.encrypt(editedSecret.value.result, inputs);
      if (newCiphertext.isOk()) {
        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, newCiphertext.value);
        });
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.EditSecret, {
          [TelemetryProperty.Success]: TelemetrySuccess.Yes,
        });
      } else {
        ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.EditSecret, newCiphertext.error);
      }
    }
  } else {
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.EditSecret, result.error);
    void window.showErrorMessage(result.error.message);
  }
}

const acExtId = "TeamsDevApp.vscode-adaptive-cards";

export async function installAdaptiveCardExt(
  ...args: unknown[]
): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.AdaptiveCardPreviewerInstall,
    getTriggerFromProperty(args)
  );
  if (acpInstalled()) {
    await vscode.window.showInformationMessage(
      localize("teamstoolkit.handlers.adaptiveCardExtUsage")
    );
  } else {
    const selection = await vscode.window.showInformationMessage(
      localize("teamstoolkit.handlers.installAdaptiveCardExt"),
      "Install",
      "Cancel"
    );
    if (selection === "Install") {
      ExtTelemetry.sendTelemetryEvent(
        TelemetryEvent.AdaptiveCardPreviewerInstallConfirm,
        getTriggerFromProperty(args)
      );
      await vscode.commands.executeCommand("workbench.extensions.installExtension", acExtId);
    } else {
      ExtTelemetry.sendTelemetryEvent(
        TelemetryEvent.AdaptiveCardPreviewerInstallCancel,
        getTriggerFromProperty(args)
      );
    }
  }
  return Promise.resolve(ok(null));
}

export function acpInstalled(): boolean {
  const extension = vscode.extensions.getExtension(acExtId);
  return !!extension;
}

export async function openPreviewAadFile(args: any[]): Promise<Result<any, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.PreviewAadManifestFile,
    getTriggerFromProperty(args)
  );
  const workspacePath = workspaceUri?.fsPath;
  const validProject = isValidProject(workspacePath);
  if (!validProject) {
    ExtTelemetry.sendTelemetryErrorEvent(
      TelemetryEvent.PreviewAadManifestFile,
      new InvalidProjectError()
    );
    return err(new InvalidProjectError());
  }

  const selectedEnv = await askTargetEnvironment();
  if (selectedEnv.isErr()) {
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.PreviewAadManifestFile, selectedEnv.error);
    return err(selectedEnv.error);
  }
  const envName = selectedEnv.value;

  const func: Func = {
    namespace: "fx-solution-azure",
    method: "buildAadManifest",
    params: {
      type: "",
    },
  };

  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.BuildAadManifestStart,
    getTriggerFromProperty(args)
  );
  const inputs = getSystemInputs();
  inputs.env = envName;
  const res = await runCommand(Stage.buildAad, inputs);

  if (res.isErr()) {
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.PreviewAadManifestFile, res.error);
    return err(res.error);
  }

  const manifestFile = `${workspacePath as string}/${BuildFolderName}/aad.${envName}.json`;

  if (fs.existsSync(manifestFile)) {
    void workspace.openTextDocument(manifestFile).then((document) => {
      void window.showTextDocument(document);
    });
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.PreviewAadManifestFile, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
    return ok(manifestFile);
  } else {
    const error = new SystemError(
      ExtensionSource,
      "FileNotFound",
      util.format(localize("teamstoolkit.handlers.fileNotFound"), manifestFile)
    );
    void showError(error);
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.PreviewAadManifestFile, error);
    return err(error);
  }
}

export async function openConfigStateFile(args: any[]): Promise<any> {
  let telemetryStartName = TelemetryEvent.OpenManifestConfigStateStart;
  let telemetryName = TelemetryEvent.OpenManifestConfigState;

  if (args && args.length > 0 && args[0].from === "aad") {
    telemetryStartName = TelemetryEvent.OpenAadConfigStateStart;
    telemetryName = TelemetryEvent.OpenAadConfigState;
  }

  ExtTelemetry.sendTelemetryEvent(telemetryStartName);
  const workspacePath = workspaceUri?.fsPath;
  if (!workspacePath) {
    const noOpenWorkspaceError = new UserError(
      ExtensionSource,
      ExtensionErrors.NoWorkspaceError,
      localize("teamstoolkit.handlers.noOpenWorkspace")
    );
    void showError(noOpenWorkspaceError);
    ExtTelemetry.sendTelemetryErrorEvent(telemetryName, noOpenWorkspaceError);
    return err(noOpenWorkspaceError);
  }

  if (!isValidProject(workspacePath)) {
    const invalidProjectError = new UserError(
      ExtensionSource,
      ExtensionErrors.InvalidProject,
      localize("teamstoolkit.handlers.invalidProject")
    );
    void showError(invalidProjectError);
    ExtTelemetry.sendTelemetryErrorEvent(telemetryName, invalidProjectError);
    return err(invalidProjectError);
  }

  let sourcePath: string | undefined = undefined;
  let env: string | undefined = undefined;
  if (args && args.length > 0) {
    env = args[0].env;
    if (!env) {
      const envRes: Result<string | undefined, FxError> = await askTargetEnvironment();
      if (envRes.isErr()) {
        ExtTelemetry.sendTelemetryErrorEvent(telemetryName, envRes.error);
        return err(envRes.error);
      }
      env = envRes.value;
    }

    // Load env folder from yml
    const envFolder = await pathUtils.getEnvFolderPath(workspacePath);
    if (envFolder.isOk() && envFolder.value) {
      sourcePath = path.resolve(`${envFolder.value}/.env.${env as string}`);
    } else if (envFolder.isErr()) {
      return err(envFolder.error);
    }
  } else {
    const invalidArgsError = new SystemError(
      ExtensionSource,
      ExtensionErrors.InvalidArgs,
      util.format(localize("teamstoolkit.handlers.invalidArgs"), args ? JSON.stringify(args) : args)
    );
    void showError(invalidArgsError);
    ExtTelemetry.sendTelemetryErrorEvent(telemetryName, invalidArgsError);
    return err(invalidArgsError);
  }

  if (sourcePath && !(await fs.pathExists(sourcePath))) {
    const noEnvError = new UserError(
      ExtensionSource,
      ExtensionErrors.EnvFileNotFoundError,
      util.format(localize("teamstoolkit.handlers.findEnvFailed"), env)
    );
    void showError(noEnvError);
    ExtTelemetry.sendTelemetryErrorEvent(telemetryName, noEnvError);
    return err(noEnvError);
  }

  void workspace.openTextDocument(sourcePath as string).then((document) => {
    void window.showTextDocument(document);
  });
  ExtTelemetry.sendTelemetryEvent(telemetryName, {
    [TelemetryProperty.Success]: TelemetrySuccess.Yes,
  });
}

export async function updatePreviewManifest(args: any[]): Promise<any> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.UpdatePreviewManifestStart,
    getTriggerFromProperty(args && args.length > 1 ? [args[1]] : undefined)
  );
  let env: string | undefined;
  if (args && args.length > 0) {
    const filePath = args[0].fsPath as string;
    if (!filePath.endsWith("manifest.template.json")) {
      const envReg = /manifest\.(\w+)\.json$/;
      const result = envReg.exec(filePath);
      if (result && result.length >= 2) {
        env = result[1];
      }
    }
  }

  const inputs = getSystemInputs();
  const result = await runCommand(Stage.deployTeams, inputs);

  if (!args || args.length === 0) {
    const workspacePath = workspaceUri?.fsPath;
    const inputs = getSystemInputs();
    inputs.ignoreEnvInfo = true;
    const env = await core.getSelectedEnv(inputs);
    if (env.isErr()) {
      ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdatePreviewManifest, env.error);
      return err(env.error);
    }
    const manifestPath = `${
      workspacePath as string
    }/${AppPackageFolderName}/${BuildFolderName}/manifest.${env.value as string}.json`;
    void workspace.openTextDocument(manifestPath).then((document) => {
      void window.showTextDocument(document);
    });
  }
  return result;
}

export async function copilotPluginAddAPIHandler(args: any[]) {
  // Telemetries are handled in runCommand()
  const inputs = getSystemInputs();
  if (args && args.length > 0) {
    const filePath = args[0].fsPath as string;
    const isFromApiPlugin: boolean = args[0].isFromApiPlugin ?? false;
    if (!isFromApiPlugin) {
      // Codelens for API ME. Trigger from manifest.json
      inputs[QuestionNames.ManifestPath] = filePath;
    } else {
      inputs[QuestionNames.Capabilities] = CapabilityOptions.copilotPluginApiSpec().id;
      inputs[QuestionNames.DestinationApiSpecFilePath] = filePath;
      inputs[QuestionNames.ManifestPath] = args[0].manifestPath;
    }
  }
  const result = await runCommand(Stage.copilotPluginAddAPI, inputs);
  return result;
}

export function editAadManifestTemplate(args: any[]) {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.EditAadManifestTemplate,
    getTriggerFromProperty(args && args.length > 1 ? [args[1]] : undefined)
  );
  if (args && args.length > 1) {
    const workspacePath = workspaceUri?.fsPath;
    const manifestPath = `${workspacePath as string}/${MetadataV3.aadManifestFileName}`;
    void workspace.openTextDocument(manifestPath).then((document) => {
      void window.showTextDocument(document);
    });
  }
}

export async function signOutAzure(isFromTreeView: boolean) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SignOutStart, {
    [TelemetryProperty.TriggerFrom]: isFromTreeView
      ? TelemetryTriggerFrom.TreeView
      : TelemetryTriggerFrom.CommandPalette,
    [TelemetryProperty.AccountType]: AccountType.Azure,
  });
  await vscode.window.showInformationMessage(
    localize("teamstoolkit.commands.azureAccount.signOutHelp")
  );
}

export async function signOutM365(isFromTreeView: boolean) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.SignOutStart, {
    [TelemetryProperty.TriggerFrom]: isFromTreeView
      ? TelemetryTriggerFrom.TreeView
      : TelemetryTriggerFrom.CommandPalette,
    [TelemetryProperty.AccountType]: AccountType.M365,
  });
  let result = false;
  result = await M365TokenInstance.signout();
  if (result) {
    accountTreeViewProviderInstance.m365AccountNode.setSignedOut();
    await envTreeProviderInstance.refreshRemoteEnvWarning();
  }
}

export async function signInAzure() {
  await vscode.commands.executeCommand("fx-extension.signinAzure");
}

export async function signInM365() {
  await vscode.commands.executeCommand("fx-extension.signinM365");
}

export interface VscQuickPickItem extends QuickPickItem {
  /**
   * Current id of the option item.
   */
  id: string;

  function: () => Promise<void>;
}

export async function migrateTeamsTabAppHandler(): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateTeamsTabAppStart);
  const selection = await VS_CODE_UI.showMessage(
    "warn",
    localize("teamstoolkit.migrateTeamsTabApp.warningMessage"),
    true,
    localize("teamstoolkit.migrateTeamsTabApp.upgrade")
  );
  const userCancelError = new UserError(
    ExtensionSource,
    ExtensionErrors.UserCancel,
    localize("teamstoolkit.common.userCancel")
  );
  if (
    selection.isErr() ||
    selection.value !== localize("teamstoolkit.migrateTeamsTabApp.upgrade")
  ) {
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.MigrateTeamsTabApp, userCancelError);
    return ok(null);
  }
  const selectFolderConfig: SelectFolderConfig = {
    name: localize("teamstoolkit.migrateTeamsTabApp.selectFolderConfig.name"),
    title: localize("teamstoolkit.migrateTeamsTabApp.selectFolderConfig.title"),
  };
  const selectFolderResult = await VS_CODE_UI.selectFolder(selectFolderConfig);
  if (selectFolderResult.isErr() || selectFolderResult.value.type !== "success") {
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.MigrateTeamsTabApp, userCancelError);
    return ok(null);
  }
  const tabAppPath = selectFolderResult.value.result as string;

  const progressBar = VS_CODE_UI.createProgressBar(
    localize("teamstoolkit.migrateTeamsTabApp.progressTitle"),
    2
  );
  await progressBar.start();

  const migrationHandler = new TeamsAppMigrationHandler(tabAppPath);
  let result: Result<null, FxError> = ok(null);
  let packageUpdated: Result<boolean, FxError> = ok(true);
  let updateFailedFiles: string[] = [];
  try {
    // Update package.json to use @microsoft/teams-js v2
    await progressBar.next(localize("teamstoolkit.migrateTeamsTabApp.updatingPackageJson"));
    VsCodeLogInstance.info(localize("teamstoolkit.migrateTeamsTabApp.updatingPackageJson"));
    packageUpdated = await migrationHandler.updatePackageJson();
    if (packageUpdated.isErr()) {
      throw packageUpdated.error;
    } else if (!packageUpdated.value) {
      // no change in package.json, show warning.
      const warningMessage = util.format(
        localize("teamstoolkit.migrateTeamsTabApp.updatePackageJsonWarning"),
        path.join(tabAppPath, "package.json")
      );
      VsCodeLogInstance.warning(warningMessage);
      void VS_CODE_UI.showMessage("warn", warningMessage, false, "OK");
    } else {
      // Update codes to use @microsoft/teams-js v2
      await progressBar.next(localize("teamstoolkit.migrateTeamsTabApp.updatingCodes"));
      VsCodeLogInstance.info(localize("teamstoolkit.migrateTeamsTabApp.updatingCodes"));
      const failedFiles = await migrationHandler.updateCodes();
      if (failedFiles.isErr()) {
        throw failedFiles.error;
      } else {
        updateFailedFiles = failedFiles.value;
        if (failedFiles.value.length > 0) {
          VsCodeLogInstance.warning(
            util.format(
              localize("teamstoolkit.migrateTeamsTabApp.updateCodesErrorOutput"),
              failedFiles.value.length,
              failedFiles.value.join(", ")
            )
          );
          void VS_CODE_UI.showMessage(
            "warn",
            util.format(
              localize("teamstoolkit.migrateTeamsTabApp.updateCodesErrorMessage"),
              failedFiles.value.length,
              failedFiles.value[0]
            ),
            false,
            "OK"
          );
        }
      }
    }
  } catch (error) {
    result = wrapError(error as Error);
  }

  if (result.isErr()) {
    await progressBar.end(false);
    void showError(result.error);
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.MigrateTeamsTabApp, result.error);
  } else {
    await progressBar.end(true);
    if (!packageUpdated.isErr() && packageUpdated.value) {
      void VS_CODE_UI.showMessage(
        "info",
        util.format(localize("teamstoolkit.migrateTeamsTabApp.success"), tabAppPath),
        false
      );
    }
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateTeamsTabApp, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      [TelemetryProperty.UpdateFailedFiles]: updateFailedFiles.length.toString(),
    });
  }
  return result;
}

export async function migrateTeamsManifestHandler(): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateTeamsManifestStart);
  const selection = await VS_CODE_UI.showMessage(
    "warn",
    localize("teamstoolkit.migrateTeamsManifest.warningMessage"),
    true,
    localize("teamstoolkit.migrateTeamsManifest.upgrade")
  );
  const userCancelError = new UserError(
    ExtensionSource,
    ExtensionErrors.UserCancel,
    localize("teamstoolkit.common.userCancel")
  );
  if (
    selection.isErr() ||
    selection.value !== localize("teamstoolkit.migrateTeamsManifest.upgrade")
  ) {
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.MigrateTeamsManifest, userCancelError);
    return ok(null);
  }
  const selectFileConfig: SelectFileConfig = {
    name: localize("teamstoolkit.migrateTeamsManifest.selectFileConfig.name"),
    title: localize("teamstoolkit.migrateTeamsManifest.selectFileConfig.title"),
  };
  const selectFileResult = await VS_CODE_UI.selectFile(selectFileConfig);
  if (selectFileResult.isErr() || selectFileResult.value.type !== "success") {
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.MigrateTeamsManifest, userCancelError);
    return ok(null);
  }
  const manifestPath = selectFileResult.value.result as string;

  const progressBar = VS_CODE_UI.createProgressBar(
    localize("teamstoolkit.migrateTeamsManifest.progressTitle"),
    1
  );
  await progressBar.start();

  const migrationHandler = new TeamsAppMigrationHandler(manifestPath);
  let result: Result<null, FxError> = ok(null);

  try {
    // Update Teams manifest
    await progressBar.next(localize("teamstoolkit.migrateTeamsManifest.updateManifest"));
    VsCodeLogInstance.info(localize("teamstoolkit.migrateTeamsManifest.updateManifest"));
    result = await migrationHandler.updateManifest();
    if (result.isErr()) {
      throw result.error;
    }
  } catch (error) {
    result = wrapError(error as Error);
  }

  if (result.isErr()) {
    await progressBar.end(false);
    void showError(result.error);
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.MigrateTeamsManifest, result.error);
  } else {
    await progressBar.end(true);
    void VS_CODE_UI.showMessage(
      "info",
      util.format(localize("teamstoolkit.migrateTeamsManifest.success"), manifestPath),
      false
    );
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateTeamsManifest, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
    });
  }
  return result;
}

export async function openLifecycleTreeview(args?: any[]) {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.ClickOpenLifecycleTreeview,
    getTriggerFromProperty(args)
  );
  if (isTeamsFxProject) {
    await vscode.commands.executeCommand("teamsfx-lifecycle.focus");
  } else {
    await vscode.commands.executeCommand("workbench.view.extension.teamsfx");
  }
}

export async function updateAadAppManifest(args: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DeployAadManifestStart);
  const inputs = getSystemInputs();
  return await runCommand(Stage.deployAad, inputs);
}

export async function selectTutorialsHandler(
  ...args: unknown[]
): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ViewGuidedTutorials, getTriggerFromProperty(args));
  const config: SingleSelectConfig = {
    name: "tutorialName",
    title: localize("teamstoolkit.commandsTreeViewProvider.guideTitle"),
    options: isSPFxProject
      ? [
          {
            id: "cicdPipeline",
            label: `${localize("teamstoolkit.guides.cicdPipeline.label")}`,
            detail: localize("teamstoolkit.guides.cicdPipeline.detail"),
            groupName: localize("teamstoolkit.guide.development"),
            data: "https://aka.ms/teamsfx-add-cicd-new",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
        ]
      : [
          {
            id: "cardActionResponse",
            label: `${localize("teamstoolkit.guides.cardActionResponse.label")}`,
            detail: localize("teamstoolkit.guides.cardActionResponse.detail"),
            groupName: localize("teamstoolkit.guide.scenario"),
            data: "https://aka.ms/teamsfx-workflow-new",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "sendNotification",
            label: `${localize("teamstoolkit.guides.sendNotification.label")}`,
            detail: localize("teamstoolkit.guides.sendNotification.detail"),
            groupName: localize("teamstoolkit.guide.scenario"),
            data: "https://aka.ms/teamsfx-notification-new",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "commandAndResponse",
            label: `${localize("teamstoolkit.guides.commandAndResponse.label")}`,
            detail: localize("teamstoolkit.guides.commandAndResponse.detail"),
            groupName: localize("teamstoolkit.guide.scenario"),
            data: "https://aka.ms/teamsfx-command-new",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "dashboardApp",
            label: `${localize("teamstoolkit.guides.dashboardApp.label")}`,
            detail: localize("teamstoolkit.guides.dashboardApp.detail"),
            groupName: localize("teamstoolkit.guide.scenario"),
            data: "https://aka.ms/teamsfx-dashboard-new",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "addTab",
            label: `${localize("teamstoolkit.guides.addTab.label")}`,
            detail: localize("teamstoolkit.guides.addTab.detail"),
            groupName: localize("teamstoolkit.guide.capability"),
            data: "https://aka.ms/teamsfx-add-tab",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "addBot",
            label: `${localize("teamstoolkit.guides.addBot.label")}`,
            detail: localize("teamstoolkit.guides.addBot.detail"),
            groupName: localize("teamstoolkit.guide.capability"),
            data: "https://aka.ms/teamsfx-add-bot",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "addME",
            label: `${localize("teamstoolkit.guides.addME.label")}`,
            detail: localize("teamstoolkit.guides.addME.detail"),
            groupName: localize("teamstoolkit.guide.capability"),
            data: "https://aka.ms/teamsfx-add-message-extension",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          ...[
            {
              id: "addOutlookAddin",
              label: `${localize("teamstoolkit.guides.addOutlookAddin.label")}`,
              detail: localize("teamstoolkit.guides.addOutlookAddin.detail"),
              groupName: localize("teamstoolkit.guide.capability"),
              data: "https://aka.ms/teamsfx-add-outlook-add-in",
              buttons: [
                {
                  iconPath: "file-symlink-file",
                  tooltip: localize("teamstoolkit.guide.tooltip.github"),
                  command: "fx-extension.openTutorial",
                },
              ],
            },
          ],
          {
            id: "addSso",
            label: `${localize("teamstoolkit.guides.addSso.label")}`,
            detail: localize("teamstoolkit.guides.addSso.detail"),
            groupName: localize("teamstoolkit.guide.development"),
            data: "https://aka.ms/teamsfx-add-sso-new",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "connectApi",
            label: `${localize("teamstoolkit.guides.connectApi.label")}`,
            detail: localize("teamstoolkit.guides.connectApi.detail"),
            groupName: localize("teamstoolkit.guide.development"),
            data: "https://aka.ms/teamsfx-add-api-connection-new",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "cicdPipeline",
            label: `${localize("teamstoolkit.guides.cicdPipeline.label")}`,
            detail: localize("teamstoolkit.guides.cicdPipeline.detail"),
            groupName: localize("teamstoolkit.guide.development"),
            data: "https://aka.ms/teamsfx-add-cicd-new",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "mobilePreview",
            label: `${localize("teamstoolkit.guides.mobilePreview.label")}`,
            detail: localize("teamstoolkit.guides.mobilePreview.detail"),
            groupName: localize("teamstoolkit.guide.development"),
            data: "https://aka.ms/teamsfx-mobile",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "multiTenant",
            label: `${localize("teamstoolkit.guides.multiTenant.label")}`,
            detail: localize("teamstoolkit.guides.multiTenant.detail"),
            groupName: localize("teamstoolkit.guide.development"),
            data: "https://aka.ms/teamsfx-multi-tenant",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "addAzureFunction",
            label: localize("teamstoolkit.guides.addAzureFunction.label"),
            detail: localize("teamstoolkit.guides.addAzureFunction.detail"),
            groupName: localize("teamstoolkit.guide.cloudServiceIntegration"),
            data: "https://aka.ms/teamsfx-add-azure-function",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "addAzureSql",
            label: localize("teamstoolkit.guides.addAzureSql.label"),
            detail: localize("teamstoolkit.guides.addAzureSql.detail"),
            groupName: localize("teamstoolkit.guide.cloudServiceIntegration"),
            data: "https://aka.ms/teamsfx-add-azure-sql",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "addAzureAPIM",
            label: localize("teamstoolkit.guides.addAzureAPIM.label"),
            detail: localize("teamstoolkit.guides.addAzureAPIM.detail"),
            groupName: localize("teamstoolkit.guide.cloudServiceIntegration"),
            data: "https://aka.ms/teamsfx-add-azure-apim",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
          {
            id: "addAzureKeyVault",
            label: localize("teamstoolkit.guides.addAzureKeyVault.label"),
            detail: localize("teamstoolkit.guides.addAzureKeyVault.detail"),
            groupName: localize("teamstoolkit.guide.cloudServiceIntegration"),
            data: "https://aka.ms/teamsfx-add-azure-keyvault",
            buttons: [
              {
                iconPath: "file-symlink-file",
                tooltip: localize("teamstoolkit.guide.tooltip.github"),
                command: "fx-extension.openTutorial",
              },
            ],
          },
        ],
    returnObject: true,
  };
  if (TreatmentVariableValue.inProductDoc && !isSPFxProject) {
    (config.options as StaticOptions).splice(0, 1, {
      id: "cardActionResponse",
      label: `${localize("teamstoolkit.guides.cardActionResponse.label")}`,
      description: localize("teamstoolkit.common.recommended"),
      detail: localize("teamstoolkit.guides.cardActionResponse.detail"),
      groupName: localize("teamstoolkit.guide.scenario"),
      data: "https://aka.ms/teamsfx-card-action-response",
      buttons: [
        {
          iconPath: "file-code",
          tooltip: localize("teamstoolkit.guide.tooltip.inProduct"),
          command: "fx-extension.openTutorial",
        },
      ],
    });
  }

  const selectedTutorial = await VS_CODE_UI.selectOption(config);
  if (selectedTutorial.isErr()) {
    return err(selectedTutorial.error);
  } else {
    const tutorial = selectedTutorial.value.result as OptionItem;
    return openTutorialHandler([TelemetryTriggerFrom.Auto, tutorial]);
  }
}

export function openTutorialHandler(args?: any[]): Promise<Result<unknown, FxError>> {
  if (!args || args.length !== 2) {
    // should never happen
    return Promise.resolve(ok(null));
  }
  const tutorial = args[1] as OptionItem;
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenTutorial, {
    ...getTriggerFromProperty(args),
    [TelemetryProperty.TutorialName]: tutorial.id,
  });
  if (
    TreatmentVariableValue.inProductDoc &&
    (tutorial.id === "cardActionResponse" || tutorial.data === "cardActionResponse")
  ) {
    WebviewPanel.createOrShow(PanelType.RespondToCardActions);
    return Promise.resolve(ok(null));
  }
  return VS_CODE_UI.openUrl(tutorial.data as string);
}

export async function azureAccountSignOutHelpHandler(
  args?: any[]
): Promise<Result<boolean, FxError>> {
  return Promise.resolve(ok(false));
}

export async function signinM365Callback(...args: unknown[]): Promise<Result<null, FxError>> {
  let node: M365AccountNode | undefined;
  if (args && args.length > 1) {
    node = args[1] as M365AccountNode;
    if (node && node.status === AccountItemStatus.SignedIn) {
      return ok(null);
    }
  }

  const triggerFrom = getTriggerFromProperty(args);
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.LoginClick, {
    [TelemetryProperty.AccountType]: AccountType.M365,
    ...triggerFrom,
  });

  const tokenRes = await tools.tokenProvider.m365TokenProvider.getJsonObject({
    scopes: AppStudioScopes,
    showDialog: true,
  });
  const token = tokenRes.isOk() ? tokenRes.value : undefined;
  if (token !== undefined && node) {
    node.setSignedIn((token as any).upn ? (token as any).upn : "");
  }

  await envTreeProviderInstance.refreshRemoteEnvWarning();
  return ok(null);
}

export async function refreshSideloadingCallback(args?: any[]): Promise<Result<null, FxError>> {
  const status = await M365TokenInstance.getStatus({ scopes: AppStudioScopes });
  if (status.isOk() && status.value.token !== undefined) {
    accountTreeViewProviderInstance.m365AccountNode.updateChecks(status.value.token, true, false);
  }

  return ok(null);
}

export async function refreshCopilotCallback(args?: any[]): Promise<Result<null, FxError>> {
  const status = await M365TokenInstance.getStatus({ scopes: AppStudioScopes });
  if (status.isOk() && status.value.token !== undefined) {
    accountTreeViewProviderInstance.m365AccountNode.updateChecks(status.value.token, false, true);
  }

  return ok(null);
}

export async function signinAzureCallback(...args: unknown[]): Promise<Result<null, FxError>> {
  let node: AzureAccountNode | undefined;
  if (args && args.length > 1) {
    node = args[1] as AzureAccountNode;
    if (node && node.status === AccountItemStatus.SignedIn) {
      return ok(null);
    }
  }

  if (azureAccountManager.getAccountInfo() === undefined) {
    // make sure user has not logged in
    const triggerFrom = getTriggerFromProperty(args);
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.LoginClick, {
      [TelemetryProperty.AccountType]: AccountType.Azure,
      ...triggerFrom,
    });
  }
  try {
    await azureAccountManager.getIdentityCredentialAsync(true);
  } catch (error) {
    if (!isUserCancelError(error)) {
      return err(error);
    }
  }
  return ok(null);
}

export async function selectSubscriptionCallback(args?: any[]): Promise<Result<null, FxError>> {
  tools.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.SelectSubscription, {
    [TelemetryProperty.TriggerFrom]: args
      ? TelemetryTriggerFrom.TreeView
      : TelemetryTriggerFrom.Other,
  });
  const askSubRes = await askSubscription(
    tools.tokenProvider.azureAccountProvider,
    VS_CODE_UI,
    undefined
  );
  if (askSubRes.isErr()) return err(askSubRes.error);
  await azureAccountManager.setSubscription(askSubRes.value.subscriptionId);
  return ok(null);
}

/**
 * scaffold based on app id from Developer Portal
 */
export async function scaffoldFromDeveloperPortalHandler(
  ...args: any[]
): Promise<Result<null, FxError>> {
  if (!args || args.length < 1) {
    // should never happen
    return ok(null);
  }

  const appId = args[0];
  const properties: { [p: string]: string } = {
    teamsAppId: appId,
  };

  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.HandleUrlFromDeveloperProtalStart, properties);
  const loginHint = args.length < 2 ? undefined : args[1];
  const progressBar = VS_CODE_UI.createProgressBar(
    localize("teamstoolkit.devPortalIntegration.checkM365Account.progressTitle"),
    1
  );

  await progressBar.start();
  let token = undefined;
  try {
    const tokenRes = await M365TokenInstance.signInWhenInitiatedFromTdp(
      { scopes: AppStudioScopes },
      loginHint
    );
    if (tokenRes.isErr()) {
      if ((tokenRes.error as any).displayMessage) {
        void window.showErrorMessage((tokenRes.error as any).displayMessage);
      } else {
        void vscode.window.showErrorMessage(
          localize("teamstoolkit.devPortalIntegration.generalError.message")
        );
      }
      ExtTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.HandleUrlFromDeveloperProtal,
        tokenRes.error,
        properties
      );
      await progressBar.end(false);
      return err(tokenRes.error);
    }
    token = tokenRes.value;

    // set region
    const AuthSvcTokenRes = await M365TokenInstance.getAccessToken({ scopes: AuthSvcScopes });
    if (AuthSvcTokenRes.isOk()) {
      await teamsDevPortalClient.setRegionEndpointByToken(AuthSvcTokenRes.value);
    }

    await progressBar.end(true);
  } catch (e) {
    void vscode.window.showErrorMessage(
      localize("teamstoolkit.devPortalIntegration.generalError.message")
    );
    await progressBar.end(false);
    const error = assembleError(e);
    ExtTelemetry.sendTelemetryErrorEvent(
      TelemetryEvent.HandleUrlFromDeveloperProtal,
      error,
      properties
    );
    return err(error);
  }

  let appDefinition;
  try {
    appDefinition = await teamsDevPortalClient.getApp(token, appId);
  } catch (error: any) {
    ExtTelemetry.sendTelemetryErrorEvent(
      TelemetryEvent.HandleUrlFromDeveloperProtal,
      error,
      properties
    );
    void vscode.window.showErrorMessage(
      localize("teamstoolkit.devPortalIntegration.getTeamsAppError.message")
    );
    return err(error);
  }

  const res = await createNewProjectHandler({ teamsAppFromTdp: appDefinition });

  if (res.isErr()) {
    ExtTelemetry.sendTelemetryErrorEvent(
      TelemetryEvent.HandleUrlFromDeveloperProtal,
      res.error,
      properties
    );
    return err(res.error);
  }

  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.HandleUrlFromDeveloperProtal, properties);
  return ok(null);
}
