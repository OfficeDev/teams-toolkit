// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CreateProjectResult,
  err,
  FxError,
  ok,
  Result,
  Stage,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import { getSystemInputs } from "../utils/systemEnvUtils";
import {
  ApiPluginStartOptions,
  CapabilityOptions,
  ProjectTypeOptions,
  QuestionNames,
} from "@microsoft/teamsfx-core";
import { runCommand } from "./sharedOpts";
import * as vscode from "vscode";
import { openFolder } from "../utils/workspaceUtils";
import { ExtensionSource } from "../error/error";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { getTriggerFromProperty } from "../utils/telemetryUtils";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/extTelemetryEvents";
import { localize } from "../utils/localizeUtils";

export async function createPluginWithManifest(args?: any[]): Promise<Result<any, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CreatePluginWithManifestStart,
    getTriggerFromProperty(args)
  );
  if (!args || args.length < 2) {
    const error = new UserError(
      ExtensionSource,
      "missingParameter",
      localize("teamstoolkit.handler.createPluginWithManifest.error.missingParameter")
    );
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CreatePluginWithManifest, error);
    return err(error);
  }

  const specPath = args[0];
  const pluginManifestPath = args[1];
  const scaffoldNew = args.length > 2 ? args[2] : true;

  const inputs = getSystemInputs();
  inputs.capabilities = CapabilityOptions.apiPlugin().id;
  inputs[QuestionNames.ApiSpecLocation] = specPath;
  inputs[QuestionNames.ApiPluginManifestPath] = pluginManifestPath;
  inputs[QuestionNames.ApiPluginType] = ApiPluginStartOptions.apiSpec().id;
  inputs[QuestionNames.ApiOperation] = pluginManifestPath;
  inputs[QuestionNames.ProjectType] = ProjectTypeOptions.copilotExtension().id;
  // TODO (kiota): handle scaffold directly scenario
  const result = await runCommand(Stage.create, inputs);

  if (result.isErr()) {
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.CreatePluginWithManifest, result.error);
    return err(result.error);
  }

  const res = result.value as CreateProjectResult;
  const projectPathUri = vscode.Uri.file(res.projectPath);
  await openFolder(projectPathUri, true, res.warnings);
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CreatePluginWithManifest, {
    [TelemetryProperty.Success]: TelemetrySuccess.Yes,
  });
  return ok({});
}
