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
  checkNpmDependencies,
  defaultHelpLink,
  DependencyStatus,
  DepsCheckerError,
  DepsManager,
  DepsType,
  FolderName,
  installExtension,
  LocalEnvManager,
  NodeNotFoundError,
  NodeNotSupportedError,
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
import { doctorLogger } from "./depsChecker/doctorLogger";
import { doctorConstant } from "./depsChecker/doctorConstant";
import { runTask } from "./teamsfxTaskHandler";

interface CheckResult {
  checker: string;
  result: boolean;
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
    const checkResults: CheckResult[] = [];
    const localEnvManager = new LocalEnvManager(
      VsCodeLogInstance,
      ExtTelemetry.reporter,
      VS_CODE_UI
    );
    const workspacePath = ext.workspaceUri.fsPath;

    // Get project settings
    const projectSettings = await localEnvManager.getProjectSettings(workspacePath);

    VsCodeLogInstance.info("LocalDebug Prerequisites Check");
    VsCodeLogInstance.outputChannel.appendLine("");

    // deps
    const depsManager = new DepsManager(doctorLogger, vscodeTelemetry);
    const depsResults = await checkDependencies(localEnvManager, depsManager, projectSettings);
    checkResults.push(...depsResults);

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

    const promiseResults = await Promise.all(checkPromises);
    for (const r of promiseResults) {
      if (r !== undefined) {
        checkResults.push(r);
      }
    }

    // local cert
    const localCertFailure = await resolveLocalCertificate(localEnvManager);
    if (localCertFailure) {
      checkResults.push(localCertFailure);
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
      checkResults.push({
        checker: "Ports",
        result: false,
        error: new UserError(ExtensionErrors.PortAlreadyInUse, message, ExtensionSource),
      });
    }

    // handle checkResults
    if (checkResults.length > 0) {
      const failureMessage = await handleCheckResults(checkResults);
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

async function checkM365Account(): Promise<CheckResult> {
  let result = true;
  let error = undefined;
  try {
    const token = await tools.tokenProvider.appStudioToken.getAccessToken(true);
    if (token === undefined) {
      // corner case but need to handle
      result = false;
      error = returnSystemError(
        new Error("No M365 account login"),
        ExtensionSource,
        ExtensionErrors.PrerequisitesValidationError
      );
    }
  } catch (err: any) {
    result = false;
    if (!error) {
      error = assembleError(err);
    }
  }
  return {
    checker: "M365 Account",
    result: result,
    error: error,
  };
}

async function checkDependencies(
  localEnvManager: LocalEnvManager,
  depsManager: DepsManager,
  projectSettings: ProjectSettings
): Promise<CheckResult[]> {
  try {
    const deps = localEnvManager.getActiveDependencies(projectSettings);
    const enabledDeps = await VSCodeDepsChecker.getEnabledDeps(deps);
    const depsStatus = await depsManager.ensureDependencies(enabledDeps, {
      fastFail: false,
      doctor: true,
    });
    const results: CheckResult[] = [];
    for (const dep of depsStatus) {
      results.push({
        checker: dep.name,
        result: dep.isInstalled,
        error: handleDepsCheckerError(dep.error, dep),
      });
    }
    return results;
  } catch (error: any) {
    return [
      {
        checker: "Dependencies",
        result: false,
        error: handleDepsCheckerError(error),
      },
    ];
  }
}

async function resolveBackendExtension(
  depsManager: DepsManager,
  projectSettings: ProjectSettings
): Promise<CheckResult> {
  let result = true;
  let error = undefined;
  try {
    if (ProjectSettingsHelper.includeBackend(projectSettings)) {
      const backendRoot = path.join(ext.workspaceUri.fsPath, FolderName.Function);
      const dotnet = (await depsManager.getStatus([DepsType.Dotnet]))[0];
      await installExtension(backendRoot, dotnet.command, doctorLogger);
    }
  } catch (err: any) {
    result = false;
    error = handleDepsCheckerError(err);
  }
  return {
    checker: "Backend Extension",
    result: result,
    error: error,
  };
}

async function resolveLocalCertificate(localEnvManager: LocalEnvManager): Promise<CheckResult> {
  let result = true;
  let error = undefined;
  try {
    // TODO: Use new trustDevCert flag
    const localSettings = await localEnvManager.getLocalSettings(ext.workspaceUri.fsPath);
    const trustDevCert = (localSettings?.frontend?.trustDevCert as boolean | undefined) ?? true;

    // TODO: Return CheckResult when isTrusted === false
    await localEnvManager.resolveLocalCertificate(trustDevCert);
  } catch (err: any) {
    result = true;
    error = assembleError(err);
  }
  return {
    checker: "Local Certificate",
    result: result,
    error: error,
  };
}

function handleDepsCheckerError(error: any, dep?: DependencyStatus): FxError {
  if (dep) {
    if (error instanceof NodeNotFoundError) {
      handleNodeNotFoundError(error);
    }
    if (error instanceof NodeNotSupportedError) {
      handleNodeNotSupportedError(error, dep);
    }
  }
  return error instanceof DepsCheckerError
    ? returnUserError(
        error,
        ExtensionSource,
        ExtensionErrors.PrerequisitesValidationError,
        error.helpLink
      )
    : assembleError(error);
}

function handleNodeNotFoundError(error: NodeNotFoundError) {
  error.message = doctorConstant.NodeNotFound;
}

function handleNodeNotSupportedError(error: any, dep: DependencyStatus) {
  const supportedVersions = dep.details.supportedVersions.map((v) => "v" + v).join(" ,");
  error.message = doctorConstant.NodeNotSupported.split("@CurrentVersion")
    .join(dep.details.installVersion)
    .split("@SupportedVersions")
    .join(supportedVersions);
}

async function checkNpmInstall(component: string, folder: string): Promise<CheckResult> {
  let installed = false;
  try {
    installed = await checkNpmDependencies(folder);
  } catch (error: any) {
    // treat check error as uninstalled
    await VsCodeLogInstance.warning(`Error when checking npm dependencies: ${error}`);
  }

  let result = true;
  let error = undefined;
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
        result = false;
        error = new UserError(
          "NpmInstallFailure",
          `Failed to npm install for ${component}`,
          ExtensionSource
        );
      }
    }
  } catch (err: any) {
    // treat unexpected error as installed
    error = err;
  }
  return {
    checker: `Npm Install(${component})`,
    result: result,
    error: error,
  };
}

async function handleCheckResults(results: CheckResult[]): Promise<void> {
  let shouldStop = false;
  const output = VsCodeLogInstance.outputChannel;
  const successes = results.filter((a) => a.result);
  const failures = results.filter((a) => !a.result);

  if (failures.length > 0) {
    shouldStop = true;
  }
  if (successes.length > 0) {
    output.appendLine("");
  }

  for (const result of successes) {
    output.appendLine(`${doctorConstant.Tick} ${result.checker} `);
  }

  for (const result of failures) {
    output.appendLine("");
    output.appendLine(`${doctorConstant.Cross} ${result.checker}`);

    if (result.error) {
      output.appendLine(`${doctorConstant.WhiteSpace}${result.error?.message}`);
      if (result.error instanceof UserError) {
        const userError = result.error as UserError;
        if (userError.helpLink) {
          output.appendLine(
            `${doctorConstant.WhiteSpace}${doctorConstant.HelpLink.split("@Link").join(
              userError.helpLink
            )}`
          );
        }
      }
    }
  }
  output.appendLine("");
  output.appendLine(`${doctorConstant.LearnMore.split("@Link").join(defaultHelpLink)}`);

  const checkers = results
    .filter((r) => !r.result)
    .map((r) => r.checker)
    .join(", ");

  if (shouldStop) {
    throw returnUserError(
      new Error(`Failed to validate prerequisites (${checkers})`),
      ExtensionSource,
      ExtensionErrors.PrerequisitesValidationError
    );
  }
}
