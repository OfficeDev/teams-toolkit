// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  assembleError,
  err,
  FxError,
  ok,
  Result,
  returnSystemError,
  returnUserError,
} from "@microsoft/teamsfx-api";

import { LocalEnvManager } from "@microsoft/teamsfx-core";
import * as util from "util";

import VsCodeLogInstance from "../commonlib/log";
import { ExtensionSource, ExtensionErrors } from "../error";
import { VS_CODE_UI } from "../extension";
import { tools } from "../handlers";
import * as StringResources from "../resources/Strings.json";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../telemetry/extTelemetryEvents";

interface CheckFailure {
  checker: string;
  error?: FxError;
}

export async function checkAndInstall(): Promise<Result<any, FxError>> {
  try {
    try {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugPrerequisitesStart);
    } catch {
      // ignore telemetry error
    }

    const failures: CheckFailure[] = [];
    const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
    // TODO: LocalEnvManager deps

    // login
    const accountFailure = await checkM365Account();
    if (accountFailure) {
      failures.push(accountFailure);
    }

    // handle failures
    if (failures.length > 0) {
      await handleFailures(failures);
      return err(
        returnUserError(
          new Error("Failed to validate prerequisites"),
          ExtensionSource,
          ExtensionErrors.PrerequisitesValidationError
        )
      );
    }

    try {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugPrerequisites, {
        [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      });
    } catch {
      // ignore telemetry error
    }
  } catch (error: any) {
    const fxError = assembleError(error);
    try {
      ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.DebugPrerequisites, fxError);
    } catch {
      // ignore telemetry error
    }

    return err(fxError);
  }

  return ok(null);
}

async function checkM365Account(): Promise<CheckFailure | undefined> {
  try {
    const token = await tools.tokenProvider.appStudioToken.getAccessToken(true);
    if (token === undefined) {
      // corner case but need to handle
      return {
        checker: "M365 Account",
        error: returnSystemError(
          new Error("No M365 account login"),
          ExtensionSource,
          ExtensionErrors.PrerequisitesValidationError
        ),
      };
    }

    return undefined;
  } catch (error: any) {
    return {
      checker: "M365 Account",
      error: assembleError(error),
    };
  }
}

async function handleFailures(failures: CheckFailure[]): Promise<void> {
  for (const failure of failures) {
    await VsCodeLogInstance.error(`${failure.checker} Checker Error: ${failure.error?.message}`);
  }

  const errorMessage = util.format(
    StringResources.vsc.localDebug.prerequisitesCheckFailure,
    failures.map((f) => f.checker).join(", ")
  );

  VS_CODE_UI.showMessage("error", errorMessage, false, "OK");
}
