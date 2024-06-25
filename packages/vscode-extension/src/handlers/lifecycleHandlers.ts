// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CreateProjectResult, err, FxError, Inputs, Result, Stage } from "@microsoft/teamsfx-api";
import { isUserCancelError, isValidOfficeAddInProject } from "@microsoft/teamsfx-core";
import { Uri } from "vscode";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent, TelemetryTriggerFrom } from "../telemetry/extTelemetryEvents";
import envTreeProviderInstance from "../treeview/environmentTreeViewProvider";
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
  const projectPathUri = Uri.file(res.projectPath);
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
