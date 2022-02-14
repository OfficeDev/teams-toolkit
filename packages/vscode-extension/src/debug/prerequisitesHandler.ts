// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  assembleError,
  err,
  FxError,
  IProgressHandler,
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
  EmptyLogger,
  FolderName,
  installExtension,
  LocalEnvManager,
  NodeNotFoundError,
  NodeNotSupportedError,
  npmInstallCommand,
  ProjectSettingsHelper,
} from "@microsoft/teamsfx-core";

import * as os from "os";
import * as path from "path";
import * as util from "util";
import * as vscode from "vscode";

import VsCodeLogInstance from "../commonlib/log";
import { ExtensionSource, ExtensionErrors } from "../error";
import { VS_CODE_UI } from "../extension";
import { ext } from "../extensionVariables";
import { showError, tools } from "../handlers";
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
import { doctorConstant } from "./depsChecker/doctorConstant";
import { runTask } from "./teamsfxTaskHandler";
import { vscodeHelper } from "./depsChecker/vscodeHelper";
import { taskEndEventEmitter, trackedTasks } from "./teamsfxTaskHandler";
import { trustDevCertHelpLink } from "./constants";
import AppStudioTokenInstance from "../commonlib/appStudioLogin";
import { ProgressHandler } from "../progressHandler";
import { ParallelProgressHelper } from "./progressHelper";

enum Checker {
  SPFx = "SPFx",
  Frontend = "frontend",
  Backend = "backend",
  Bot = "bot",
  M365Account = "M365 Account",
  LocalCertificate = "Local Certificate",
  Node = "Node.js",
  Dependencies = "Dependencies",
  AzureFunctionsExtension = "Azure Functions Extension",
  Ports = "Ports",
}

interface CheckResult {
  checker: string;
  result: ResultStatus;
  error?: FxError;
  successMsg?: string;
  failureMsg?: string;
}

enum ResultStatus {
  success = "success",
  warn = "warn",
  failed = "failed",
}

const NpmInstallDisplayName = {
  SPFx: "tab app (SPFx-based)",
  Frontend: "tab app (react-based)",
  Bot: "bot app",
  Backend: "function app",
};

const CheckerProgressMessage = Object.freeze({
  [Checker.M365Account]: `Checking ${Checker.M365Account}`,
  [Checker.AzureFunctionsExtension]: `Installing ${Checker.AzureFunctionsExtension}`,
  [Checker.LocalCertificate]: `Checking ${Checker.LocalCertificate}`,
  [Checker.SPFx]: `Executing NPM Install for ${NpmInstallDisplayName.SPFx}`,
  [Checker.Frontend]: `Executing NPM Install for ${NpmInstallDisplayName.Frontend}`,
  [Checker.Bot]: `Executing NPM Install for ${NpmInstallDisplayName.Bot}`,
  [Checker.Backend]: `Executing NPM Install for ${NpmInstallDisplayName.Backend}`,
  [Checker.Ports]: `Checking ${Checker.Ports}`,
  [Checker.Node]: `Checking ${Checker.Node}`,
});

const DepsProgressMessage = Object.freeze({
  [DepsType.FunctionNode]: `Checking ${Checker.Node}`,
  [DepsType.SpfxNode]: `Checking ${Checker.Node}`,
  [DepsType.AzureNode]: `Checking ${Checker.Node}`,
  [DepsType.Dotnet]: "Checking and installing .NET Core SDK",
  [DepsType.Ngrok]: "Checking and installing Ngrok",
  [DepsType.FuncCoreTools]: "Checking and installing Azure Function Core Tool",
});

export async function checkAndInstall(): Promise<Result<any, FxError>> {
  let progressBar: IProgressHandler | undefined;
  try {
    try {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugPrerequisitesStart);
    } catch {
      // ignore telemetry error
    }

    // [node] => [account, certificate, deps] => [backend extension, npm install] => [port]
    const checkResults: CheckResult[] = [];
    const localEnvManager = new LocalEnvManager(
      VsCodeLogInstance,
      ExtTelemetry.reporter,
      VS_CODE_UI
    );
    const workspacePath = ext.workspaceUri.fsPath;

    // Get project settings
    const projectSettings = await localEnvManager.getProjectSettings(workspacePath);
    VsCodeLogInstance.outputChannel.show();
    VsCodeLogInstance.info("LocalDebug Prerequisites Check");
    VsCodeLogInstance.outputChannel.appendLine(doctorConstant.Check);
    // TODO: add total number
    VsCodeLogInstance.outputChannel.appendLine(doctorConstant.CheckNumber);

    // Get deps
    const depsManager = new DepsManager(vscodeLogger, vscodeTelemetry);
    // TODO update it into usage
    const enabledCheckers = await getEnabledCheckers(projectSettings);
    const enabledDeps = await VSCodeDepsChecker.getEnabledDeps(
      localEnvManager.getActiveDependencies(projectSettings)
    );

    progressBar = new ProgressHandler(
      "Prerequisites Check",
      enabledCheckers.length + enabledDeps.length
    );
    await progressBar.start();

    // node
    await progressBar.next(CheckerProgressMessage[Checker.Node]);
    const nodeResult = await checkNode(enabledDeps, depsManager);
    if (nodeResult) {
      checkResults.push(nodeResult);
    }

    await checkFailure(checkResults, progressBar);
    VsCodeLogInstance.outputChannel.appendLine("");

    // login checker
    await progressBar.next(CheckerProgressMessage[Checker.M365Account]);
    const accountResult = await checkM365Account();
    checkResults.push(accountResult);

    // local cert
    await progressBar.next(CheckerProgressMessage[Checker.LocalCertificate]);
    const localCertResult = await resolveLocalCertificate(localEnvManager);
    checkResults.push(localCertResult);

    // deps
    const depsResults = await checkDependencies(enabledDeps, depsManager, progressBar);
    checkResults.push(...depsResults);

    await checkFailure(checkResults, progressBar);

    const checkPromises = [];
    const progressMessages: { key: string; detail: string }[] = [];

    const parallelProgressHelper = new ParallelProgressHelper(progressBar);
    // backend extension
    if (enabledCheckers.includes(Checker.AzureFunctionsExtension)) {
      checkPromises.push(
        resolveBackendExtension(depsManager).finally(() =>
          parallelProgressHelper.end(Checker.AzureFunctionsExtension)
        )
      );
      progressMessages.push({
        key: Checker.AzureFunctionsExtension,
        detail: CheckerProgressMessage[Checker.AzureFunctionsExtension],
      });
    }

    // npm installs
    if (enabledCheckers.includes(Checker.SPFx)) {
      checkPromises.push(
        checkNpmInstall(
          Checker.SPFx,
          path.join(workspacePath, FolderName.SPFx),
          NpmInstallDisplayName.SPFx
        ).finally(() => parallelProgressHelper.end(Checker.SPFx))
      );
      progressMessages.push({
        key: Checker.SPFx,
        detail: CheckerProgressMessage[Checker.SPFx],
      });
    }

    if (enabledCheckers.includes(Checker.Backend)) {
      checkPromises.push(
        checkNpmInstall(
          Checker.Backend,
          path.join(workspacePath, FolderName.Function),
          NpmInstallDisplayName.Backend
        ).finally(() => parallelProgressHelper.end(Checker.Backend))
      );
      progressMessages.push({
        key: Checker.Backend,
        detail: CheckerProgressMessage[Checker.Backend],
      });
    }

    if (enabledCheckers.includes(Checker.Bot)) {
      checkPromises.push(
        checkNpmInstall(
          Checker.Bot,
          path.join(workspacePath, FolderName.Bot),
          NpmInstallDisplayName.Bot
        ).finally(() => parallelProgressHelper.end(Checker.Bot))
      );
      progressMessages.push({
        key: Checker.Bot,
        detail: CheckerProgressMessage[Checker.Bot],
      });
    }

    if (enabledCheckers.includes(Checker.Frontend)) {
      checkPromises.push(
        checkNpmInstall(
          Checker.Frontend,
          path.join(workspacePath, FolderName.Frontend),
          NpmInstallDisplayName.Frontend
        ).finally(() => parallelProgressHelper.end(Checker.Frontend))
      );
      progressMessages.push({
        key: Checker.Frontend,
        detail: CheckerProgressMessage[Checker.Frontend],
      });
    }

    await parallelProgressHelper.startAll(progressMessages);

    const promiseResults = await Promise.all(checkPromises);
    for (const r of promiseResults) {
      if (r !== undefined) {
        checkResults.push(r);
      }
    }
    await checkFailure(checkResults, progressBar);

    // check port
    await progressBar.next(CheckerProgressMessage[Checker.Ports]);
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
        checker: Checker.Ports,
        result: ResultStatus.failed,
        error: new UserError(ExtensionErrors.PortAlreadyInUse, message, ExtensionSource),
      });
    }

    // handle checkResults
    await handleCheckResults(checkResults, progressBar);

    try {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugPrerequisites, {
        [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      });
    } catch {
      // ignore telemetry error
    }
  } catch (error: any) {
    const fxError = assembleError(error);
    showError(fxError);
    await progressBar?.end(false);
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
  let result = ResultStatus.success;
  let error = undefined;
  const failureMsg = Checker.M365Account;
  let loginHint = undefined;
  try {
    VsCodeLogInstance.outputChannel.appendLine(`Checking M365 account ...`);
    const token = await tools.tokenProvider.appStudioToken.getAccessToken(true);
    if (token === undefined) {
      // corner case but need to handle
      result = ResultStatus.failed;
      error = returnSystemError(
        new Error("No M365 account login"),
        ExtensionSource,
        ExtensionErrors.PrerequisitesValidationError
      );
    }
    const tokenObject = (await AppStudioTokenInstance.getStatus())?.accountInfo;
    if (tokenObject && tokenObject.upn) {
      loginHint = tokenObject.upn;
    }
  } catch (err: any) {
    result = ResultStatus.failed;
    if (!error) {
      error = assembleError(err);
    }
  }
  return {
    checker: Checker.M365Account,
    result: result,
    successMsg:
      result && loginHint
        ? doctorConstant.SignInSuccess.split("@account").join(`${loginHint}`)
        : Checker.M365Account,
    failureMsg: failureMsg,
    error: error,
  };
}

async function checkNode(
  enabledDeps: DepsType[],
  depsManager: DepsManager
): Promise<CheckResult | undefined> {
  try {
    for (const dep of enabledDeps) {
      if (VSCodeDepsChecker.getNodeDeps().includes(dep)) {
        const nodeStatus = (
          await depsManager.ensureDependencies([dep], {
            fastFail: false,
            doctor: true,
          })
        )[0];
        return {
          checker: nodeStatus.name,
          result: nodeStatus.isInstalled ? ResultStatus.success : ResultStatus.failed,
          successMsg: nodeStatus.isInstalled
            ? doctorConstant.NodeSuccess.split("@Version").join(nodeStatus.details.installVersion)
            : nodeStatus.name,
          failureMsg: nodeStatus.name,
          error: handleDepsCheckerError(nodeStatus.error, nodeStatus),
        };
      }
    }
    return undefined;
  } catch (error: any) {
    return {
      checker: Checker.Node,
      result: ResultStatus.failed,
      successMsg: Checker.Node,
      failureMsg: Checker.Node,
      error: handleDepsCheckerError(error),
    };
  }
}

async function checkDependencies(
  enabledDeps: DepsType[],
  depsManager: DepsManager,
  progressBar: IProgressHandler
): Promise<CheckResult[]> {
  try {
    const nonNodeDeps = enabledDeps.filter((d) => !VSCodeDepsChecker.getNodeDeps().includes(d));
    const results: CheckResult[] = [];
    for (const nonNodeDep of nonNodeDeps) {
      await progressBar.next(DepsProgressMessage[nonNodeDep]);
      const depsStatus = await depsManager.ensureDependencies([nonNodeDep], {
        fastFail: false,
        doctor: true,
      });

      for (const dep of depsStatus) {
        results.push({
          checker: dep.name,
          result: dep.isInstalled ? ResultStatus.success : ResultStatus.failed,
          successMsg: `${dep.name} (installed at ${dep.details.binFolders?.[0]})`,
          error: handleDepsCheckerError(dep.error, dep),
        });
      }
    }
    return results;
  } catch (error: any) {
    return [
      {
        checker: Checker.Dependencies,
        result: ResultStatus.failed,
        error: handleDepsCheckerError(error),
      },
    ];
  }
}

async function resolveBackendExtension(depsManager: DepsManager): Promise<CheckResult> {
  try {
    const backendRoot = path.join(ext.workspaceUri.fsPath, FolderName.Function);
    const dotnet = (await depsManager.getStatus([DepsType.Dotnet]))[0];
    await installExtension(backendRoot, dotnet.command, new EmptyLogger());
    return {
      checker: Checker.AzureFunctionsExtension,
      result: ResultStatus.success,
    };
  } catch (err: any) {
    return {
      checker: Checker.AzureFunctionsExtension,
      result: ResultStatus.failed,
      error: handleDepsCheckerError(err),
    };
  }
}

async function resolveLocalCertificate(localEnvManager: LocalEnvManager): Promise<CheckResult> {
  let result = ResultStatus.success;
  let error = undefined;
  try {
    VsCodeLogInstance.outputChannel.appendLine(`Checking Local Certificate ...`);
    const trustDevCert = vscodeHelper.isTrustDevCertEnabled();
    const localCertResult = await localEnvManager.resolveLocalCertificate(trustDevCert);

    if (typeof localCertResult.isTrusted === "undefined") {
      result = ResultStatus.warn;
      error = returnUserError(
        new Error("Skip trusting local certificate."),
        ExtensionSource,
        "SkipTrustDevCertError",
        trustDevCertHelpLink
      );
    } else if (localCertResult.isTrusted === false) {
      result = ResultStatus.failed;
      error = localCertResult.error;
    }
  } catch (err: any) {
    result = ResultStatus.failed;
    error = assembleError(err);
  }
  return {
    checker: Checker.LocalCertificate,
    result: result,
    successMsg: doctorConstant.CertSuccess,
    failureMsg: doctorConstant.Cert,
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
  error.message = `${doctorConstant.NodeNotFound}${os.EOL}${doctorConstant.WhiteSpace}${doctorConstant.RestartVSCode}`;
}

function handleNodeNotSupportedError(error: any, dep: DependencyStatus) {
  const supportedVersions = dep.details.supportedVersions.map((v) => "v" + v).join(" ,");
  error.message = `${doctorConstant.NodeNotSupported.split("@CurrentVersion")
    .join(dep.details.installVersion)
    .split("@SupportedVersions")
    .join(supportedVersions)}${os.EOL}${doctorConstant.WhiteSpace}${doctorConstant.RestartVSCode}`;
}

async function checkNpmInstall(
  component: string,
  folder: string,
  displayName: string
): Promise<CheckResult> {
  let installed = false;
  try {
    installed = await checkNpmDependencies(folder);
  } catch (error: any) {
    // treat check error as uninstalled
    await VsCodeLogInstance.warning(`Error when checking npm dependencies: ${error}`);
  }

  let result = ResultStatus.success;
  let error = undefined;
  try {
    if (!installed) {
      let exitCode: number | undefined;

      const checkNpmInstallRunning = () => {
        for (const [key, value] of trackedTasks) {
          if (value === `${component} npm install`) {
            return true;
          }
        }
        return false;
      };
      if (checkNpmInstallRunning()) {
        exitCode = await new Promise((resolve: (value: number | undefined) => void) => {
          const endListener = taskEndEventEmitter.event((result) => {
            if (result.name === `${component} npm install`) {
              endListener.dispose();
              resolve(result.exitCode);
            }
          });
          if (!checkNpmInstallRunning()) {
            endListener.dispose();
            resolve(undefined);
          }
        });
      } else {
        VsCodeLogInstance.outputChannel.appendLine(`Executing NPM Install for ${displayName} ...`);
        exitCode = await runTask(
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
      }

      // check npm dependencies again if exit code not zero
      if (exitCode !== 0 && !(await checkNpmDependencies(folder))) {
        result = ResultStatus.failed;
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
    checker: component,
    result: result,
    successMsg: doctorConstant.NpmInstallSuccess.split("@app").join(displayName),
    failureMsg: doctorConstant.NpmInstallFailue.split("@app").join(displayName),
    error: error,
  };
}

async function handleCheckResults(
  results: CheckResult[],
  progressBar: IProgressHandler
): Promise<void> {
  if (results.length <= 0) {
    return;
  }

  let shouldStop = false;
  const output = VsCodeLogInstance.outputChannel;
  const successes = results.filter((a) => a.result === ResultStatus.success);
  const failures = results.filter((a) => a.result === ResultStatus.failed);
  const warnings = results.filter((a) => a.result === ResultStatus.warn);
  output.show();
  output.appendLine("");
  output.appendLine(doctorConstant.Summary);

  if (failures.length > 0) {
    shouldStop = true;
  }
  if (successes.length > 0) {
    output.appendLine("");
  }

  for (const result of successes) {
    output.appendLine(`${doctorConstant.Tick} ${result.successMsg ?? result.checker} `);
  }

  for (const result of warnings) {
    output.appendLine("");
    output.appendLine(`${doctorConstant.Exclamation} ${result.checker} `);
    outputCheckResultError(result, output);
  }

  for (const result of failures) {
    output.appendLine("");
    output.appendLine(`${doctorConstant.Cross} ${result.failureMsg ?? result.checker}`);
    outputCheckResultError(result, output);
  }
  output.appendLine("");
  output.appendLine(`${doctorConstant.LearnMore.split("@Link").join(defaultHelpLink)}`);

  if (!shouldStop) {
    output.appendLine("");
    output.appendLine(`${doctorConstant.LaunchServices}`);
    await progressBar.end(true);
  }

  if (shouldStop) {
    await progressBar.end(false);
    throw returnUserError(
      new Error(`Prerequisites Check Failed, please fix all issues above then local debug again.`),
      ExtensionSource,
      ExtensionErrors.PrerequisitesValidationError
    );
  }
}

function outputCheckResultError(result: CheckResult, output: vscode.OutputChannel) {
  if (result.error) {
    let message: string = result.error.message;
    if (result.checker === "M365 Account" && message.startsWith("User Cancel")) {
      message = doctorConstant.SignInCancelled;
    }

    output.appendLine(`${doctorConstant.WhiteSpace}${message}`);

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

async function checkFailure(checkResults: CheckResult[], progressBar: IProgressHandler) {
  if (checkResults.some((r) => !r.result)) {
    await handleCheckResults(checkResults, progressBar);
  }
}

async function getEnabledCheckers(projectSettings: ProjectSettings): Promise<Checker[]> {
  const checkers: Checker[] = [Checker.LocalCertificate, Checker.M365Account];
  if (ProjectSettingsHelper.isSpfx(projectSettings)) {
    checkers.push(Checker.SPFx);
  } else {
    checkers.push(Checker.Ports);
    if (ProjectSettingsHelper.includeFrontend(projectSettings)) {
      checkers.push(Checker.Frontend);
    }

    if (ProjectSettingsHelper.includeBackend(projectSettings)) {
      checkers.push(Checker.Backend);
      checkers.push(Checker.AzureFunctionsExtension);
    }

    if (ProjectSettingsHelper.includeBot(projectSettings)) {
      checkers.push(Checker.Bot);
    }
  }

  return checkers;
}
