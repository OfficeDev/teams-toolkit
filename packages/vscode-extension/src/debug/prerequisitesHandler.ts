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
  UserError,
} from "@microsoft/teamsfx-api";
import { LocalEnvManager, ProjectSettingsHelper, FolderName } from "@microsoft/teamsfx-core";
import * as path from "path";
import * as vscode from "vscode";
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
    if (!vscode.workspace.workspaceFolders) {
      throw new UserError(
        ExtensionErrors.NoWorkspaceError,
        StringResources.vsc.handlers.noOpenWorkspace,
        ExtensionSource
      );
    }
    const workspaceFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];
    const workspacePath: string = workspaceFolder.uri.fsPath;
    const projectSettings = await localEnvManager.getProjectSettings(workspacePath);

    // deps
    const depsChecker = new VSCodeDepsChecker(vscodeLogger, vscodeTelemetry, false);
    const depsFailure = await checkDependencies(localEnvManager, depsChecker, projectSettings);
    if (depsFailure) {
      failures.push(depsFailure);
    }

    // backend extension
    const backendExtensionFailure = await resolveBackendExtension(
      depsChecker,
      workspacePath,
      projectSettings
    );
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
  depsChecker: VSCodeDepsChecker,
  projectSettings: ProjectSettings
): Promise<CheckFailure | undefined> {
  try {
    const deps = localEnvManager.getActiveDependencies(projectSettings);

    const resolveRes = await depsChecker.resolve(deps);
    if (resolveRes.isErr()) {
      return {
        checker: "Dependencies",
        error: returnUserError(
          resolveRes.error,
          ExtensionSource,
          ExtensionErrors.PrerequisitesValidationError,
          resolveRes.error.helpLink
        ),
      };
    }

    return undefined;
  } catch (error: any) {
    return {
      checker: "Dependencies",
      error: assembleError(error),
    };
  }
}
async function resolveBackendExtension(
  depsChecker: VSCodeDepsChecker,
  workspacePath: string,
  projectSettings: ProjectSettings
): Promise<CheckFailure | undefined> {
  try {
    if (ProjectSettingsHelper.includeBackend(projectSettings)) {
      const backendRoot = path.join(workspacePath, FolderName.Function);

      const res = await installBackendExtension(backendRoot, depsChecker, vscodeLogger);
      if (res.isErr()) {
        return {
          checker: "Backend Extension",
          error: returnUserError(
            res.error,
            ExtensionSource,
            ExtensionErrors.PrerequisitesValidationError,
            res.error.helpLink
          ),
        };
      }
    }

    return undefined;
  } catch (error: any) {
    return {
      checker: "Backend Extension",
      error: assembleError(error),
    };
  }
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
