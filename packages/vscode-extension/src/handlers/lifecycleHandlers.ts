// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CreateProjectResult,
  err,
  FxError,
  Inputs,
  ok,
  Result,
  Stage,
} from "@microsoft/teamsfx-api";
import {
  ApiPluginStartOptions,
  AppStudioScopes,
  assembleError,
  AuthSvcScopes,
  CapabilityOptions,
  isUserCancelError,
  isValidOfficeAddInProject,
  QuestionNames,
  teamsDevPortalClient,
} from "@microsoft/teamsfx-core";
import * as vscode from "vscode";
import M365TokenInstance from "../commonlib/m365Login";
import { VS_CODE_UI } from "../qm/vsc_ui";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent, TelemetryTriggerFrom } from "../telemetry/extTelemetryEvents";
import envTreeProviderInstance from "../treeview/environmentTreeViewProvider";
import { localize } from "../utils/localizeUtils";
import { getSystemInputs } from "../utils/systemEnvUtils";
import { getTriggerFromProperty } from "../utils/telemetryUtils";
import { openFolder, openOfficeDevFolder } from "../utils/workspaceUtils";
import { invokeTeamsAgent } from "./copilotChatHandlers";
import { runCommand } from "./sharedOpts";

export async function createNewProjectHandler(...args: any[]): Promise<Result<any, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CreateProjectStart, getTriggerFromProperty(args));
  let inputs: Inputs | undefined;
  if (args?.length === 1) {
    if (!!args[0].teamsAppFromTdp) {
      inputs = getSystemInputs();
      inputs.teamsAppFromTdp = args[0].teamsAppFromTdp;
    }
  } else if (args?.length === 2) {
    // from copilot chat
    inputs = { ...getSystemInputs(), ...args[1] };
  }
  const result = await runCommand(Stage.create, inputs);
  if (result.isErr()) {
    return err(result.error);
  }

  const res = result.value as CreateProjectResult;
  if (res.shouldInvokeTeamsAgent) {
    await invokeTeamsAgent([TelemetryTriggerFrom.CreateAppQuestionFlow]);
    return result;
  }
  const projectPathUri = vscode.Uri.file(res.projectPath);
  const isOfficeAddin = isValidOfficeAddInProject(projectPathUri.fsPath);
  // If it is triggered in @office /create for code gen, then do no open the temp folder.
  if (isOfficeAddin && inputs?.agent === "office") {
    return result;
  }
  // show local debug button by default
  if (isOfficeAddin) {
    await openOfficeDevFolder(projectPathUri, true, res.warnings, args);
  } else {
    await openFolder(projectPathUri, true, res.warnings, args);
  }
  return result;
}

export async function provisionHandler(...args: unknown[]): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ProvisionStart, getTriggerFromProperty(args));
  const result = await runCommand(Stage.provision);
  if (result.isErr() && isUserCancelError(result.error)) {
    return result;
  } else {
    // refresh env tree except provision cancelled.
    await envTreeProviderInstance.reloadEnvironments();
    return result;
  }
}

export async function deployHandler(...args: unknown[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DeployStart, getTriggerFromProperty(args));
  return await runCommand(Stage.deploy);
}

export async function publishHandler(...args: unknown[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.PublishStart, getTriggerFromProperty(args));
  return await runCommand(Stage.publish);
}

export async function addWebpartHandler(...args: unknown[]) {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.AddWebpartStart, getTriggerFromProperty(args));
  return await runCommand(Stage.addWebpart);
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
      inputs[QuestionNames.ApiPluginType] = ApiPluginStartOptions.apiSpec().id;
      inputs[QuestionNames.DestinationApiSpecFilePath] = filePath;
      inputs[QuestionNames.ManifestPath] = args[0].manifestPath;
    }
  }
  const result = await runCommand(Stage.copilotPluginAddAPI, inputs);
  return result;
}
