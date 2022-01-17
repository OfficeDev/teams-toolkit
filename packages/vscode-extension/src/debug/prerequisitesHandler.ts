// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  assembleError,
  err,
  FxError,
  ok,
  ProductName,
  ProjectSettings,
  Result,
  returnSystemError,
  returnUserError,
  UserError,
} from "@microsoft/teamsfx-api";
import {
  DepsCheckerError,
  DepsManager,
  DepsType,
  FolderName,
  installExtension,
  LocalEnvManager,
  npmInstallCommand,
  ProjectSettingsHelper,
} from "@microsoft/teamsfx-core";

import * as path from "path";
import * as util from "util";
import * as vscode from "vscode";

import VsCodeLogInstance from "../commonlib/log";
import { ExtensionSource, ExtensionErrors } from "../error";
import { VS_CODE_UI } from "../extension";
import { ext } from "../extensionVariables";
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
import { checkNpmDependencies } from "./npmInstallHandler";
import { runTask } from "./teamsfxTaskHandler";

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

    // [deps] => [backend extension, npm install, account] => [certificate] => [port]

    const failures: CheckFailure[] = [];
    const localEnvManager = new LocalEnvManager(
      VsCodeLogInstance,
      ExtTelemetry.reporter,
      VS_CODE_UI
    );
    const workspacePath = ext.workspaceUri.fsPath;

    // Get project settings
    const projectSettings = await localEnvManager.getProjectSettings(workspacePath);

    // deps
    const depsManager = new DepsManager(vscodeLogger, vscodeTelemetry);
    const depsFailures = await checkDependencies(localEnvManager, depsManager, projectSettings);
    failures.push(...depsFailures);

    const checkPromises = [];

    // backend extension
    checkPromises.push(resolveBackendExtension(depsManager, projectSettings));

    // npm installs
    if (ProjectSettingsHelper.isSpfx(projectSettings)) {
      checkPromises.push(checkNpmInstall("SPFx", path.join(workspacePath, FolderName.SPFx)));
    } else {
      if (ProjectSettingsHelper.includeFrontend(projectSettings)) {
        checkPromises.push(
          checkNpmInstall("frontend", path.join(workspacePath, FolderName.Frontend))
        );
      }

      if (ProjectSettingsHelper.includeBackend(projectSettings)) {
        checkPromises.push(
          checkNpmInstall("backend", path.join(workspacePath, FolderName.Function))
        );
      }

      if (ProjectSettingsHelper.includeBot(projectSettings)) {
        checkPromises.push(checkNpmInstall("bot", path.join(workspacePath, FolderName.Bot)));
      }
    }

    // login checker
    checkPromises.push(checkM365Account());

    const checkResults = await Promise.all(checkPromises);
    for (const r of checkResults) {
      if (r !== undefined) {
        failures.push(r);
      }
    }

    // local cert
    const localCertFailure = await resolveLocalCertificate(localEnvManager);
    if (localCertFailure) {
      failures.push(localCertFailure);
    }

    // check port
    const portsInUse = await localEnvManager.getPortsInUse(workspacePath, projectSettings);
    if (portsInUse.length > 0) {
      let message: string;
      if (portsInUse.length > 1) {
        message = util.format(
          StringResources.vsc.localDebug.portsAlreadyInUse,
          portsInUse.join(", ")
        );
      } else {
        message = util.format(StringResources.vsc.localDebug.portAlreadyInUse, portsInUse[0]);
      }
      failures.push({
        checker: "Ports",
        error: new UserError(ExtensionErrors.PortAlreadyInUse, message, ExtensionSource),
      });
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
      // TODO: check before install backend extension
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

async function resolveLocalCertificate(
  localEnvManager: LocalEnvManager
): Promise<CheckFailure | undefined> {
  try {
    // TODO: Use new trustDevCert flag
    const localSettings = await localEnvManager.getLocalSettings(ext.workspaceUri.fsPath);
    const trustDevCert = (localSettings?.frontend?.trustDevCert as boolean | undefined) ?? true;

    // TODO: Return CheckFailure when isTrusted === false
    await localEnvManager.resolveLocalCertificate(trustDevCert);
    return undefined;
  } catch (error: any) {
    return {
      checker: "Local Certificate",
      error: assembleError(error),
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

async function checkNpmInstall(
  component: string,
  folder: string
): Promise<CheckFailure | undefined> {
  let installed = false;
  try {
    installed = await checkNpmDependencies(folder);
  } catch (error: any) {
    // treat check error as uninstalled
    await VsCodeLogInstance.warning(`Error when checking npm dependencies: ${error}`);
  }

  try {
    if (!installed) {
      const exitCode = await runTask(
        new vscode.Task(
          {
            type: "shell",
            command: `${component} npm install`,
          },
          vscode.workspace.workspaceFolders![0],
          `${component} npm install`,
          ProductName,
          new vscode.ShellExecution(npmInstallCommand, { cwd: folder })
        )
      );

      // check npm dependencies again if exit code not zero
      if (exitCode !== 0 && !(await checkNpmDependencies(folder))) {
        return {
          checker: `Npm Install(${component})`,
          error: new UserError(
            "NpmInstallFailure",
            `Failed to npm install for ${component}`,
            ExtensionSource
          ),
        };
      }
    }

    return undefined;
  } catch (error: any) {
    // treat unexpected error as installed
    await VsCodeLogInstance.warning(`Error when checking npm install: ${error}`);
    return undefined;
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
