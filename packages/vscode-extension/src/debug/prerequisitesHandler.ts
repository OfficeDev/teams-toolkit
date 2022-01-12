// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  assembleError,
  err,
  FxError,
  ok,
  ProjectSettings,
  Result,
  returnSystemError,
  returnUserError,
} from "@microsoft/teamsfx-api";
import {
  LocalEnvManager,
  ProjectSettingsHelper,
  FolderName,
  DepsManager,
  DepsType,
  installExtension,
  DepsCheckerError,
} from "@microsoft/teamsfx-core";

import * as path from "path";
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
import { VSCodeDepsChecker } from "./depsChecker/vscodeChecker";
import { vscodeTelemetry } from "./depsChecker/vscodeTelemetry";
import { vscodeLogger } from "./depsChecker/vscodeLogger";
import { installBackendExtension } from "./depsChecker/backendExtensionsInstall";
import { ext } from "../extensionVariables";

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

    // Get project settings
    const projectSettings = await localEnvManager.getProjectSettings(ext.workspaceUri.fsPath);

    // deps
    const depsManager = new DepsManager(vscodeLogger, vscodeTelemetry);
    const depsFailures = await checkDependencies(localEnvManager, depsManager, projectSettings);
    failures.push(...depsFailures);

    // backend extension
    const backendExtensionFailure = await resolveBackendExtension(depsManager, projectSettings);
    if (backendExtensionFailure) {
      failures.push(backendExtensionFailure);
    }

    // login
    const accountFailure = await checkM365Account();
    if (accountFailure) {
      failures.push(accountFailure);
    }

    // handle failures
    if (failures.length > 0) {
      const failureMessage = await handleFailures(failures);
      throw returnUserError(
        new Error(`Failed to validate prerequisites (${failureMessage})`),
        ExtensionSource,
        ExtensionErrors.PrerequisitesValidationError
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

async function checkDependencies(
  localEnvManager: LocalEnvManager,
  depsManager: DepsManager,
  projectSettings: ProjectSettings
): Promise<CheckFailure[]> {
  try {
    const deps = localEnvManager.getActiveDependencies(projectSettings);
    const enabledDeps = await VSCodeDepsChecker.getEnabledDeps(deps);
    const depsStatus = await depsManager.ensureDependencies(enabledDeps, { fastFail: false });
    const failures: CheckFailure[] = [];
    for (const dep of depsStatus) {
      if (!dep.isInstalled && dep.error) {
        failures.push({
          checker: dep.name,
          error: handleDepsCheckerError(dep.error),
        });
      }
    }
    return failures;
  } catch (error: any) {
    return [
      {
        checker: "Dependencies",
        error: handleDepsCheckerError(error),
      },
    ];
  }
}

async function resolveBackendExtension(
  depsManager: DepsManager,
  projectSettings: ProjectSettings
): Promise<CheckFailure | undefined> {
  try {
    if (ProjectSettingsHelper.includeBackend(projectSettings)) {
      const backendRoot = path.join(ext.workspaceUri.fsPath, FolderName.Function);
      const dotnet = (await depsManager.getStatus([DepsType.Dotnet]))[0];
      await installExtension(backendRoot, dotnet.command, vscodeLogger);
    }
    return undefined;
  } catch (error: any) {
    return {
      checker: "Backend Extension",
      error: handleDepsCheckerError(error),
    };
  }
}

function handleDepsCheckerError(error: any): FxError {
  return error instanceof DepsCheckerError
    ? returnUserError(
        error,
        ExtensionSource,
        ExtensionErrors.PrerequisitesValidationError,
        error.helpLink
      )
    : assembleError(error);
}

async function handleFailures(failures: CheckFailure[]): Promise<string> {
  for (const failure of failures) {
    await VsCodeLogInstance.error(`${failure.checker} Checker Error: ${failure.error?.message}`);
  }

  const checkers = failures.map((f) => f.checker).join(", ");
  const errorMessage = util.format(
    StringResources.vsc.localDebug.prerequisitesCheckFailure,
    checkers
  );

  VS_CODE_UI.showMessage("error", errorMessage, false, "OK");
  return checkers;
}
