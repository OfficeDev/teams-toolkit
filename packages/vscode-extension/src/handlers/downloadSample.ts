// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as uuid from "uuid";
import { FxError, Inputs, Result, Stage, err, ok } from "@microsoft/teamsfx-api";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/extTelemetryEvents";
import { getSystemInputs } from "../utils/systemEnvUtils";
import { getTriggerFromProperty } from "../utils/telemetryUtils";
import { core } from "../globalVariables";
import { Uri, window } from "vscode";
import { isUserCancelError } from "@microsoft/teamsfx-core";
import { isLoginFailureError, showError, wrapError } from "../error/common";
import { localize } from "../utils/localizeUtils";
import { openFolder } from "../utils/workspaceUtils";
import { checkCoreNotEmpty } from "../utils/commonUtils";

export async function downloadSampleApp(...args: unknown[]) {
  const sampleId = args[1] as string;
  const props: any = {
    [TelemetryProperty.TriggerFrom]: getTriggerFromProperty(args),
    [TelemetryProperty.SampleAppName]: sampleId,
  };
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DownloadSampleStart, props);
  const inputs: Inputs = getSystemInputs();
  inputs["samples"] = sampleId;
  inputs.projectId = inputs.projectId ?? uuid.v4();

  const res = await downloadSample(inputs);
  if (inputs.projectId) {
    props[TelemetryProperty.NewProjectId] = inputs.projectId;
  }
  if (res.isOk()) {
    props[TelemetryProperty.Success] = TelemetrySuccess.Yes;
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DownloadSample, props);
    await openFolder(res.value, true);
  } else {
    props[TelemetryProperty.Success] = TelemetrySuccess.No;
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.DownloadSample, res.error, props);
  }
}

export async function downloadSample(inputs: Inputs): Promise<Result<any, FxError>> {
  let result: Result<any, FxError>;
  try {
    const checkCoreRes = checkCoreNotEmpty();
    if (checkCoreRes.isErr()) {
      throw checkCoreRes.error;
    }

    inputs.stage = Stage.create;
    const tmpResult = await core.createSampleProject(inputs);
    if (tmpResult.isErr()) {
      result = err(tmpResult.error);
    } else {
      const uri = Uri.file(tmpResult.value.projectPath);
      result = ok(uri);
    }
  } catch (e) {
    result = wrapError(e as Error);
  }

  if (result.isErr()) {
    const error = result.error;
    if (!isUserCancelError(error)) {
      if (isLoginFailureError(error)) {
        void window.showErrorMessage(localize("teamstoolkit.handlers.loginFailed"));
      } else {
        void showError(error);
      }
    }
  }

  return result;
}
