// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as util from "util";
import { window } from "vscode";
import { Result, FxError, SingleSelectConfig, Inputs } from "@microsoft/teamsfx-api";
import { wrapError } from "../error/common";
import { VS_CODE_UI } from "../qm/vsc_ui";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import { localize } from "../utils/localizeUtils";
import { checkCoreNotEmpty } from "../utils/commonUtils";
import { getSystemInputs } from "../utils/systemEnvUtils";
import { processResult } from "./sharedOpts";
import { core } from "../globalVariables";
import VsCodeLogInstance from "../commonlib/log";

export async function manageCollaboratorHandler(env?: string): Promise<Result<any, FxError>> {
  let result: Result<any, FxError>;
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

export async function grantPermission(env?: string): Promise<Result<any, FxError>> {
  let result: Result<any, FxError>;
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

    void window.showInformationMessage(grantSucceededMsg);
    VsCodeLogInstance.info(grantSucceededMsg);
  } catch (e) {
    result = wrapError(e);
  }

  await processResult(TelemetryEvent.GrantPermission, result, inputs);
  return result;
}

export async function listCollaborator(env?: string): Promise<Result<any, FxError>> {
  let result: Result<any, FxError>;
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

    VsCodeLogInstance.outputChannel.show();
  } catch (e) {
    result = wrapError(e);
  }

  await processResult(TelemetryEvent.ListCollaborator, result, inputs);
  return result;
}
