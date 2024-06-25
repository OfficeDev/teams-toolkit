// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/* eslint-disable @typescript-eslint/no-floating-promises */

/**
 * @author Huajie Zhang <zhjay23@qq.com>
 */
"use strict";

import {
  FxError,
  Result,
  SelectFileConfig,
  SelectFolderConfig,
  Stage,
  SubscriptionInfo,
  UserError,
  Void,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import {
  AppStudioScopes,
  AuthSvcScopes,
  CapabilityOptions,
  DepsManager,
  DepsType,
  Hub,
  QuestionNames,
  askSubscription,
  assembleError,
  getHashedEnv,
  isUserCancelError,
  isValidProject,
  teamsDevPortalClient,
} from "@microsoft/teamsfx-core";
import * as path from "path";
import * as util from "util";
import * as vscode from "vscode";
import azureAccountManager from "./commonlib/azureLogin";
import VsCodeLogInstance from "./commonlib/log";
import M365TokenInstance from "./commonlib/m365Login";
import { AzurePortalUrl } from "./constants";
import { PanelType } from "./controls/PanelType";
import { WebviewPanel } from "./controls/webviewPanel";
import { checkPrerequisitesForGetStarted } from "./debug/depsChecker/getStartedChecker";
import { vscodeLogger } from "./debug/depsChecker/vscodeLogger";
import { vscodeTelemetry } from "./debug/depsChecker/vscodeTelemetry";
import { openHubWebClient } from "./debug/launch";
import { selectAndDebug } from "./debug/runIconHandler";
import { showError, wrapError } from "./error/common";
import { ExtensionErrors, ExtensionSource } from "./error/error";
import { core, isTeamsFxProject, tools, workspaceUri } from "./globalVariables";
import { createNewProjectHandler } from "./handlers/lifecycleHandlers";
import { processResult, runCommand } from "./handlers/sharedOpts";
import { TeamsAppMigrationHandler } from "./migration/migrationHandler";
import { VS_CODE_UI } from "./qm/vsc_ui";
import { ExtTelemetry } from "./telemetry/extTelemetry";
import {
  AccountType,
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
import { openFolderInExplorer } from "./utils/commonUtils";
import { getResourceGroupNameFromEnv, getSubscriptionInfoFromEnv } from "./utils/envTreeUtils";
import { getDefaultString, localize } from "./utils/localizeUtils";
import { triggerV3Migration } from "./utils/migrationUtils";
import { ExtensionSurvey } from "./utils/survey";
import { getSystemInputs } from "./utils/systemEnvUtils";
import { getTriggerFromProperty } from "./utils/telemetryUtils";

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
    const uri = vscode.Uri.file(path);
    openFolderInExplorer(uri.fsPath);
  }
  return Promise.resolve(ok(null));
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

export async function openSamplesHandler(...args: unknown[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.Samples, getTriggerFromProperty(args));
  WebviewPanel.createOrShow(PanelType.SampleGallery, args);
  return Promise.resolve(ok(null));
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
    void vscode.window.showErrorMessage(result.error.message);
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
        void vscode.window.showErrorMessage((tokenRes.error as any).displayMessage);
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
