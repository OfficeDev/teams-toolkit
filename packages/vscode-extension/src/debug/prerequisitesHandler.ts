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
  EmptyLogger,
  FolderName,
  getSideloadingStatus,
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
import { ProgressHelper } from "./progressHelper";

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

const ProgressMessage: { [key: string]: string } = Object.freeze({
  [Checker.M365Account]: `Checking ${Checker.M365Account}`,
  [Checker.AzureFunctionsExtension]: `Installing ${Checker.AzureFunctionsExtension}`,
  [Checker.LocalCertificate]: `Checking ${Checker.LocalCertificate}`,
  [Checker.SPFx]: `Executing NPM Install for ${NpmInstallDisplayName.SPFx}`,
  [Checker.Frontend]: `Executing NPM Install for ${NpmInstallDisplayName.Frontend}`,
  [Checker.Bot]: `Executing NPM Install for ${NpmInstallDisplayName.Bot}`,
  [Checker.Backend]: `Executing NPM Install for ${NpmInstallDisplayName.Backend}`,
  [Checker.Ports]: `Checking ${Checker.Ports}`,
  [Checker.Node]: `Checking ${Checker.Node}`,
  [DepsType.FunctionNode]: `Checking ${Checker.Node}`,
  [DepsType.SpfxNode]: `Checking ${Checker.Node}`,
  [DepsType.AzureNode]: `Checking ${Checker.Node}`,
  [DepsType.Dotnet]: "Checking and installing .NET Core SDK",
  [DepsType.Ngrok]: "Checking and installing Ngrok",
  [DepsType.FuncCoreTools]: "Checking and installing Azure Function Core Tool",
});

async function checkPort(
  localEnvManager: LocalEnvManager,
  workspacePath: string,
  projectSettings: ProjectSettings,
  displayMessage: string
): Promise<CheckResult> {
  VsCodeLogInstance.outputChannel.appendLine(displayMessage);
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
    return {
      checker: Checker.Ports,
      result: ResultStatus.failed,
      error: new UserError(ExtensionErrors.PortAlreadyInUse, message, ExtensionSource),
    };
  }
  return {
    checker: Checker.Ports,
    result: ResultStatus.success,
  };
}

export async function checkAndInstall(): Promise<Result<any, FxError>> {
  let progressHelper: ProgressHelper | undefined;
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

    // Get deps
    const depsManager = new DepsManager(vscodeLogger, vscodeTelemetry);
    // TODO update it into usage
    const enabledCheckers = await getOrderedCheckers(projectSettings, localEnvManager);
    const totalSteps = enabledCheckers.length;
    let currentStep = 1;

    VsCodeLogInstance.outputChannel.appendLine(
      doctorConstant.CheckNumber.split("@number").join(`${totalSteps}`)
    );
    progressHelper = new ProgressHelper(new ProgressHandler("Prerequisites Check", totalSteps));
    await progressHelper.start(
      enabledCheckers.map((v) => {
        return { key: v, detail: ProgressMessage[v] };
      })
    );

    // node
    const nodeResult = await checkNode(
      getDeps(enabledCheckers),
      depsManager,
      `(${currentStep++}/${totalSteps})`
    );
    await progressHelper.end(Checker.Node);
    if (nodeResult) {
      checkResults.push(nodeResult);
    }

    await checkFailure(checkResults, progressHelper);
    VsCodeLogInstance.outputChannel.appendLine("");

    // login checker
    const accountResult = await checkM365Account(`(${currentStep++}/${totalSteps})`);
    await progressHelper.end(Checker.M365Account);
    checkResults.push(accountResult);

    // local cert
    const localCertResult = await resolveLocalCertificate(
      localEnvManager,
      `(${currentStep++}/${totalSteps})`
    );
    await progressHelper.end(Checker.LocalCertificate);
    checkResults.push(localCertResult);

    // deps
    const nonNodeDeps = getDeps(enabledCheckers).filter(
      (d) => !VSCodeDepsChecker.getNodeDeps().includes(d)
    );
    const depsResults = await checkDependencies(
      nonNodeDeps,
      depsManager,
      progressHelper,
      currentStep,
      totalSteps
    );
    currentStep += nonNodeDeps.length;
    checkResults.push(...depsResults);

    await checkFailure(checkResults, progressHelper);

    const checkPromises = [];

    // backend extension
    if (enabledCheckers.includes(Checker.AzureFunctionsExtension)) {
      checkPromises.push(
        resolveBackendExtension(depsManager, `(${currentStep++}/${totalSteps})`).finally(() =>
          progressHelper?.end(Checker.AzureFunctionsExtension)
        )
      );
    }

    // npm installs
    if (enabledCheckers.includes(Checker.SPFx)) {
      checkPromises.push(
        checkNpmInstall(
          Checker.SPFx,
          path.join(workspacePath, FolderName.SPFx),
          NpmInstallDisplayName.SPFx,
          `(${currentStep++}/${totalSteps}) ${ProgressMessage[Checker.SPFx]} ...`
        ).finally(() => progressHelper?.end(Checker.SPFx))
      );
    }

    if (enabledCheckers.includes(Checker.Backend)) {
      checkPromises.push(
        checkNpmInstall(
          Checker.Backend,
          path.join(workspacePath, FolderName.Function),
          NpmInstallDisplayName.Backend,
          `(${currentStep++}/${totalSteps}) ${ProgressMessage[Checker.Backend]} ...`
        ).finally(() => progressHelper?.end(Checker.Backend))
      );
    }

    if (enabledCheckers.includes(Checker.Bot)) {
      checkPromises.push(
        checkNpmInstall(
          Checker.Bot,
          path.join(workspacePath, FolderName.Bot),
          NpmInstallDisplayName.Bot,
          `(${currentStep++}/${totalSteps}) ${ProgressMessage[Checker.Bot]} ...`
        ).finally(() => progressHelper?.end(Checker.Bot))
      );
    }

    if (enabledCheckers.includes(Checker.Frontend)) {
      checkPromises.push(
        checkNpmInstall(
          Checker.Frontend,
          path.join(workspacePath, FolderName.Frontend),
          NpmInstallDisplayName.Frontend,
          `(${currentStep++}/${totalSteps}) ${ProgressMessage[Checker.Frontend]} ...`
        ).finally(() => progressHelper?.end(Checker.Frontend))
      );
    }

    const promiseResults = await Promise.all(checkPromises);
    for (const r of promiseResults) {
      if (r !== undefined) {
        checkResults.push(r);
      }
    }
    await checkFailure(checkResults, progressHelper);

    // check port
    const portResult = await checkPort(
      localEnvManager,
      workspacePath,
      projectSettings,
      `(${currentStep++}/${totalSteps}) ${ProgressMessage[Checker.Ports]} ...`
    );
    checkResults.push(portResult);
    await progressHelper.end(Checker.Ports);

    // handle checkResults
    await handleCheckResults(checkResults, progressHelper);

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
    await progressHelper?.stop(false);
    try {
      ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.DebugPrerequisites, fxError);
    } catch {
      // ignore telemetry error
    }

    return err(fxError);
  }

  return ok(null);
}

async function checkM365Account(prefix: string): Promise<CheckResult> {
  let result = ResultStatus.success;
  let error = undefined;
  const failureMsg = Checker.M365Account;
  let loginHint = undefined;
  try {
    VsCodeLogInstance.outputChannel.appendLine(
      `${prefix} ${ProgressMessage[Checker.M365Account]} ...`
    );
    const token = await tools.tokenProvider.appStudioToken.getAccessToken(true);
    if (token === undefined) {
      // corner case but need to handle
      result = ResultStatus.failed;
      error = returnSystemError(
        new Error("No M365 account login"),
        ExtensionSource,
        ExtensionErrors.PrerequisitesValidationError
      );
    } else {
      const isSideloadingEnabled = await getSideloadingStatus(token);
      if (isSideloadingEnabled === false) {
        // sideloading disabled
        result = ResultStatus.failed;
        error = new UserError(
          ExtensionErrors.PrerequisitesValidationError,
          StringResources.vsc.accountTree.sideloadingWarningTooltip,
          ExtensionSource
        );
      }
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
  depsManager: DepsManager,
  prefix: string
): Promise<CheckResult | undefined> {
  try {
    for (const dep of enabledDeps) {
      if (VSCodeDepsChecker.getNodeDeps().includes(dep)) {
        VsCodeLogInstance.outputChannel.appendLine(
          `${prefix} ${ProgressMessage[Checker.Node]} ...`
        );
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
  progressHelper: ProgressHelper,
  currentStep: number,
  totalSteps: number
): Promise<CheckResult[]> {
  try {
    const results: CheckResult[] = [];
    for (const nonNodeDep of enabledDeps) {
      VsCodeLogInstance.outputChannel.appendLine(
        `(${currentStep++}/${totalSteps}) ${ProgressMessage[nonNodeDep]} ...`
      );

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
      await progressHelper.end(nonNodeDep);
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

async function resolveBackendExtension(
  depsManager: DepsManager,
  prefix: string
): Promise<CheckResult> {
  try {
    VsCodeLogInstance.outputChannel.appendLine(
      `${prefix} ${ProgressMessage[Checker.AzureFunctionsExtension]} ...`
    );
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

async function resolveLocalCertificate(
  localEnvManager: LocalEnvManager,
  prefix: string
): Promise<CheckResult> {
  let result = ResultStatus.success;
  let error = undefined;
  try {
    VsCodeLogInstance.outputChannel.appendLine(
      `${prefix} ${ProgressMessage[Checker.LocalCertificate]} ...`
    );
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
  appName: string,
  displayMessage: string
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
        VsCodeLogInstance.outputChannel.appendLine(displayMessage);
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
    successMsg: doctorConstant.NpmInstallSuccess.split("@app").join(appName),
    failureMsg: doctorConstant.NpmInstallFailue.split("@app").join(appName),
    error: error,
  };
}

async function handleCheckResults(
  results: CheckResult[],
  progressHelper: ProgressHelper
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
    await progressHelper.stop(true);
  }

  if (shouldStop) {
    await progressHelper.stop(false);
    throw returnUserError(
      new Error(`Prerequisites Check Failed, please fix all issues above then local debug again.`),
      ExtensionSource,
      ExtensionErrors.PrerequisitesValidationError
    );
  }
}

function outputCheckResultError(result: CheckResult, output: vscode.OutputChannel) {
  if (result.error) {
    output.appendLine(`${doctorConstant.WhiteSpace}${result.error.message}`);

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

async function checkFailure(checkResults: CheckResult[], progressHelper: ProgressHelper) {
  if (checkResults.some((r) => !r.result)) {
    await handleCheckResults(checkResults, progressHelper);
  }
}

async function getOrderedCheckers(
  projectSettings: ProjectSettings,
  localEnvManager: LocalEnvManager
): Promise<(Checker | DepsType)[]> {
  const checkers: (Checker | DepsType)[] = [];
  const enabledDeps = await VSCodeDepsChecker.getEnabledDeps(
    localEnvManager.getActiveDependencies(projectSettings)
  );
  const nodeDeps = enabledDeps.filter((d) => VSCodeDepsChecker.getNodeDeps().includes(d));
  const nonNodeDeps = enabledDeps.filter((d) => !VSCodeDepsChecker.getNodeDeps().includes(d));
  checkers.push(...nodeDeps);
  checkers.push(Checker.M365Account, Checker.LocalCertificate);
  checkers.push(...nonNodeDeps);

  if (ProjectSettingsHelper.isSpfx(projectSettings)) {
    checkers.push(Checker.SPFx);
  } else {
    if (ProjectSettingsHelper.includeBackend(projectSettings)) {
      checkers.push(Checker.AzureFunctionsExtension);
      checkers.push(Checker.Backend);
    }

    if (ProjectSettingsHelper.includeBot(projectSettings)) {
      checkers.push(Checker.Bot);
    }
    if (ProjectSettingsHelper.includeFrontend(projectSettings)) {
      checkers.push(Checker.Frontend);
    }
  }
  checkers.push(Checker.Ports);
  return checkers;
}

function getDeps(checkerOrDeps: (Checker | DepsType)[]): DepsType[] {
  return checkerOrDeps.map((v) => v as DepsType).filter((v) => Object.values(DepsType).includes(v));
}
