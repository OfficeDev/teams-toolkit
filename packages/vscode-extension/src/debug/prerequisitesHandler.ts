// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Qianhao Dong <qidon@microsoft.com>
 */
import {
  assembleError,
  err,
  FxError,
  ok,
  ProductName,
  Result,
  SystemError,
  UnknownError,
  UserError,
  UserErrorOptions,
  Void,
  M365TokenProvider,
} from "@microsoft/teamsfx-api";
import {
  checkNpmDependencies,
  FolderName,
  LocalEnvManager,
  baseNpmInstallCommand,
  defaultNpmInstallArg,
  ProjectSettingsHelper,
  TelemetryContext,
} from "@microsoft/teamsfx-core/build/common/local";
import { Prerequisite } from "@microsoft/teamsfx-core/build/common/local/constants";

import {
  DependencyStatus,
  DepsCheckerError,
  DepsManager,
  DepsType,
  EmptyLogger,
  installExtension,
  NodeNotFoundError,
  validationSettingsHelpLink,
  NodeNotSupportedError,
  InstallOptions,
  V3NodeNotSupportedError,
  NodeNotLtsError,
} from "@microsoft/teamsfx-core/build/common/deps-checker";
import { LocalEnvProvider } from "@microsoft/teamsfx-core/build/component/debugHandler";
import {
  AppStudioScopes,
  getSideloadingStatus,
  isV3Enabled,
} from "@microsoft/teamsfx-core/build/common/tools";
import { PluginNames } from "@microsoft/teamsfx-core/build/component/constants";
import { FileNotFoundError } from "@microsoft/teamsfx-core/build/error/common";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as util from "util";
import * as vscode from "vscode";

import VsCodeLogInstance from "../commonlib/log";
import { ExtensionSource, ExtensionErrors } from "../error";
import { VS_CODE_UI } from "../extension";
import * as globalVariables from "../globalVariables";
import { tools, openAccountHelpHandler } from "../handlers";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  TelemetryDebugDevCertStatus,
  TelemetryEvent,
  TelemetryProperty,
} from "../telemetry/extTelemetryEvents";
import { VSCodeDepsChecker } from "./depsChecker/vscodeChecker";
import { vscodeTelemetry } from "./depsChecker/vscodeTelemetry";
import { vscodeLogger } from "./depsChecker/vscodeLogger";
import { doctorConstant } from "./depsChecker/doctorConstant";
import { vscodeHelper } from "./depsChecker/vscodeHelper";
import {
  taskEndEventEmitter,
  trackedTasks,
  allRunningTeamsfxTasks,
  terminateAllRunningTeamsfxTasks,
  runTask,
} from "./teamsfxTaskHandler";
import {
  trustDevCertHelpLink,
  prerequisiteCheckDisplayMessages,
  npmInstallDisplayMessages,
  DisplayMessages,
  prerequisiteCheckTaskDisplayMessages,
  prerequisiteCheckForGetStartedDisplayMessages,
  v3PrerequisiteCheckTaskDisplayMessages,
} from "./constants";
import M365TokenInstance from "../commonlib/m365Login";
import { signedOut } from "../commonlib/common/constant";
import { ProgressHandler } from "../progressHandler";
import { ProgressHelper } from "./progressHelper";
import { getDefaultString, localize } from "../utils/localizeUtils";
import * as commonUtils from "./commonUtils";
import { localTelemetryReporter } from "./localTelemetryReporter";
import { Step } from "./commonUtils";
import { PrerequisiteArgVxTestApp } from "./taskTerminal/prerequisiteTaskTerminal";

enum Checker {
  NpmInstall = "npm package installation",
  M365Account = "Microsoft 365 Account",
  LocalCertificate = "development certificate for localhost",
  AzureFunctionsExtension = "Azure Functions binding extension",
  Ports = "ports occupancy",
}

const DepsDisplayName = {
  [DepsType.SpfxNode]: "Node.js",
  [DepsType.AzureNode]: "Node.js",
  [DepsType.LtsNode]: "Node.js",
  [DepsType.ProjectNode]: "Node.js",
  [DepsType.Dotnet]: ".NET Core SDK",
  [DepsType.Ngrok]: "ngrok",
  [DepsType.FuncCoreTools]: "Azure Functions Core Tools",
  [DepsType.VxTestApp]: "Video Extensibility Test App",
};

interface CheckResult {
  checker: string;
  result: ResultStatus;
  error?: FxError;
  successMsg?: string;
  warnMsg?: string;
  failureMsg?: string;
}

enum ResultStatus {
  success = "success",
  warn = "warn",
  failed = "failed",
}

enum NpmInstallComponent {
  SPFx = "SPFx",
  Frontend = "frontend",
  Backend = "backend",
  Bot = "bot",
}

const NpmInstallDisplayName = Object.freeze({
  [NpmInstallComponent.SPFx]: "tab app (SPFx-based)",
  [NpmInstallComponent.Frontend]: "tab app (react-based)",
  [NpmInstallComponent.Bot]: "bot app",
  [NpmInstallComponent.Backend]: "function app",
});

const ProjectFolderName = Object.freeze({
  [NpmInstallComponent.SPFx]: FolderName.SPFx,
  [NpmInstallComponent.Frontend]: FolderName.Frontend,
  [NpmInstallComponent.Bot]: FolderName.Bot,
  [NpmInstallComponent.Backend]: FolderName.Function,
});

const ProgressMessage = Object.freeze({
  [Checker.M365Account]: `Checking ${Checker.M365Account}`,
  [Checker.AzureFunctionsExtension]: `Installing ${Checker.AzureFunctionsExtension}`,
  [Checker.LocalCertificate]: `Checking ${Checker.LocalCertificate}`,
  [Checker.NpmInstall]: (displayName: string | undefined, cwd: string) =>
    displayName
      ? `Checking and installing npm packages for ${displayName}`
      : `Checking and installing npm packages in directory ${cwd}`,
  [Checker.Ports]: `Checking ${Checker.Ports}`,
  [DepsType.SpfxNode]: `Checking ${DepsDisplayName[DepsType.SpfxNode]}`,
  [DepsType.AzureNode]: `Checking ${DepsDisplayName[DepsType.AzureNode]}`,
  [DepsType.LtsNode]: `Checking ${DepsDisplayName[DepsType.LtsNode]}`,
  [DepsType.ProjectNode]: `Checking ${DepsDisplayName[DepsType.ProjectNode]}`,
  [DepsType.Dotnet]: `Checking and installing ${DepsDisplayName[DepsType.Dotnet]}`,
  [DepsType.Ngrok]: `Checking and installing ${DepsDisplayName[DepsType.Ngrok]}`,
  [DepsType.FuncCoreTools]: `Checking and installing ${DepsDisplayName[DepsType.FuncCoreTools]}`,
  [DepsType.VxTestApp]: `Checking and installing ${DepsDisplayName[DepsType.VxTestApp]}`,
});

type NpmInstallCheckerInfo = {
  checker: Checker.NpmInstall;
  cwd: string;
  args: string[];
  forceUpdate?: boolean;
  component: string;
  displayName?: string;
};
type PortCheckerInfo = { checker: Checker.Ports; ports: number[] };
type VxTestAppCheckerInfo = { checker: DepsType.VxTestApp; vxTestApp: { version: string } };
type PrerequisiteCheckerInfo = { checker: Checker | DepsType; [key: string]: any };

type PrerequisiteOrderedChecker = {
  info: PrerequisiteCheckerInfo | PrerequisiteCheckerInfo[];
  fastFail: boolean;
};

interface Dependency {
  depsType: DepsType;
  installOptions?: InstallOptions;
}

async function runWithCheckResultTelemetryProperties(
  eventName: string,
  initialProperties: { [key: string]: string },
  action: (ctx: TelemetryContext) => Promise<CheckResult>
): Promise<CheckResult> {
  return await localTelemetryReporter.runWithTelemetryGeneric(
    eventName,
    action,
    (result: CheckResult) => {
      return result.result === ResultStatus.success ? undefined : result.error;
    },
    initialProperties
  );
}

async function runWithCheckResultsTelemetry(
  eventName: string,
  errorName: string, // unified error name of multiple errors in CheckResult[]
  initialProperties: { [key: string]: string },
  action: (ctx: TelemetryContext) => Promise<CheckResult[]>
): Promise<CheckResult[]> {
  return await localTelemetryReporter.runWithTelemetryGeneric(
    eventName,
    action,
    (results: CheckResult[], ctx: TelemetryContext) => {
      const errorCodes: { [checker: string]: string } = {};
      for (const result of results) {
        if (result.result === ResultStatus.failed) {
          errorCodes[result.checker] = result.error?.name || UnknownError.name;
        }
      }
      if (Object.keys(errorCodes).length == 0) {
        return undefined;
      } else {
        // multiple errors in one event
        ctx.properties[TelemetryProperty.DebugErrorCodes] = JSON.stringify(errorCodes);
        addCheckResultsForTelemetry(results, ctx.properties, ctx.errorProps);
        return new UserError({
          source: ExtensionSource,
          name: errorName,
        });
      }
    },
    initialProperties
  );
}

// Mainly addresses two issues:
// 1. Some error messages contain special characters which will cause the whole debug-check-results to be redacted.
// 2. CheckResult[] is hard to parse in kusto query (an array of objects).
//
// `debug-check-results` contains only known content and we know it will not be redacted.
// `debug-check-results-raw` might contain arbitrary string and be redacted.
function convertCheckResultsForTelemetry(checkResults: CheckResult[]): [string, string] {
  const resultRaw: { [checker: string]: unknown } = {};
  const resultSafe: { [checker: string]: { [key: string]: string | undefined } } = {};
  for (const checkResult of checkResults) {
    resultRaw[checkResult.checker] = checkResult;
    resultSafe[checkResult.checker] = {
      result: checkResult.result,
      source: checkResult.error?.source,
      errorCode: checkResult.error?.name,
      errorType:
        checkResult.error === undefined
          ? undefined
          : checkResult.error instanceof UserError
          ? "user"
          : checkResult.error instanceof SystemError
          ? "system"
          : "unknown",
    };
  }

  return [JSON.stringify(resultRaw), JSON.stringify(resultSafe)];
}

function addCheckResultsForTelemetry(
  checkResults: CheckResult[],
  properties: { [key: string]: string },
  errorProps: string[]
): void {
  const [resultRaw, resultSafe] = convertCheckResultsForTelemetry(checkResults);
  properties[TelemetryProperty.DebugCheckResultsSafe] = resultSafe;
  properties[TelemetryProperty.DebugCheckResults] = resultRaw;
  // only the raw event contains error message
  errorProps.push(TelemetryProperty.DebugCheckResults);
}

async function checkPort(
  localEnvManager: LocalEnvManager,
  ports: number[],
  displayMessage: string,
  additionalTelemetryProperties: { [key: string]: string }
): Promise<CheckResult> {
  return await runWithCheckResultTelemetryProperties(
    TelemetryEvent.DebugPrereqsCheckPorts,
    additionalTelemetryProperties,
    async (ctx: TelemetryContext) => {
      VsCodeLogInstance.outputChannel.appendLine(displayMessage);
      const portsInUse = await localEnvManager.getPortsInUse(ports);
      const formatPortStr = (ports: number[]) =>
        ports.length > 1 ? ports.join(", ") : `${ports[0]}`;
      if (portsInUse.length > 0) {
        ctx.properties[TelemetryProperty.DebugPortsInUse] = JSON.stringify(portsInUse);
        const message = util.format(
          getDefaultString("teamstoolkit.localDebug.portsAlreadyInUse"),
          formatPortStr(portsInUse)
        );
        const displayMessage = util.format(
          localize("teamstoolkit.localDebug.portsAlreadyInUse"),
          formatPortStr(portsInUse)
        );

        return {
          checker: Checker.Ports,
          result: ResultStatus.failed,
          failureMsg: doctorConstant.Port,
          error: new UserError(
            ExtensionSource,
            ExtensionErrors.PortAlreadyInUse,
            message,
            displayMessage
          ),
        };
      }
      return {
        checker: Checker.Ports,
        result: ResultStatus.success,
        successMsg: doctorConstant.PortSuccess.replace("@port", formatPortStr(ports)),
      };
    }
  );
}

export async function checkPrerequisitesForGetStarted(): Promise<Result<void, FxError>> {
  const nodeChecker = await getOrderedCheckersForGetStarted();
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.GetStartedPrerequisitesStart);
  const res = await _checkAndInstall(prerequisiteCheckForGetStartedDisplayMessages, nodeChecker, {
    [TelemetryProperty.DebugIsTransparentTask]: "false",
  });
  if (res.error) {
    ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.GetStartedPrerequisites, res.error);
    return err(res.error);
  }
  return ok(undefined);
}

export async function checkAndInstall(): Promise<Result<void, FxError>> {
  const projectComponents = await commonUtils.getProjectComponents();
  const orderedCheckers = await getOrderedCheckers();

  // projectComponents is already serialized JSON string
  const additionalTelemetryProperties = {
    [TelemetryProperty.DebugProjectComponents]: `${projectComponents}`,
    [TelemetryProperty.DebugIsTransparentTask]: "false",
  };

  return await localTelemetryReporter.runWithTelemetryProperties(
    TelemetryEvent.DebugPrerequisites,
    additionalTelemetryProperties,
    async (ctx: TelemetryContext) => {
      // terminate all running teamsfx tasks
      if (allRunningTeamsfxTasks.size > 0) {
        VsCodeLogInstance.info("Terminate all running teamsfx tasks.");
        terminateAllRunningTeamsfxTasks();
      }

      const res = await _checkAndInstall(
        prerequisiteCheckDisplayMessages,
        orderedCheckers,
        additionalTelemetryProperties
      );
      if (res.error) {
        const debugSession = commonUtils.getLocalDebugSession();
        addCheckResultsForTelemetry(
          res.checkResults,
          debugSession.properties,
          debugSession.errorProps
        );
        addCheckResultsForTelemetry(res.checkResults, ctx.properties, ctx.errorProps);
        return err(res.error);
      }
      return ok(undefined);
    }
  );
}

export async function checkAndInstallForTask(
  prerequisites: string[],
  ports: number[] | undefined,
  vxTestApp: PrerequisiteArgVxTestApp | undefined,
  telemetryProperties: { [key: string]: string }
): Promise<Result<Void, FxError>> {
  const orderedCheckers = await getOrderedCheckersForTask(prerequisites, ports, vxTestApp);
  const projectComponents = await commonUtils.getProjectComponents();

  const additionalTelemetryProperties = Object.assign(
    {
      [TelemetryProperty.DebugProjectComponents]: `${projectComponents}`,
      [TelemetryProperty.DebugIsTransparentTask]: "true",
    },
    telemetryProperties
  );
  return await localTelemetryReporter.runWithTelemetryProperties(
    TelemetryEvent.DebugPrerequisites,
    additionalTelemetryProperties,
    async (ctx: TelemetryContext) => {
      // terminate all running teamsfx tasks
      if (allRunningTeamsfxTasks.size > 0) {
        VsCodeLogInstance.info("Terminate all running teamsfx tasks.");
        terminateAllRunningTeamsfxTasks();
      }

      const res = await _checkAndInstall(
        isV3Enabled()
          ? v3PrerequisiteCheckTaskDisplayMessages
          : prerequisiteCheckTaskDisplayMessages,
        orderedCheckers,
        additionalTelemetryProperties
      );
      if (res.error) {
        const debugSession = commonUtils.getLocalDebugSession();
        addCheckResultsForTelemetry(
          res.checkResults,
          debugSession.properties,
          debugSession.errorProps
        );
        addCheckResultsForTelemetry(res.checkResults, ctx.properties, ctx.errorProps);
        return err(res.error);
      }
      return ok(Void);
    }
  );
}

export async function checkAndInstallNpmPackagesForTask(
  projectOptions: {
    cwd: string;
    args?: string[];
    forceUpdate?: boolean;
  }[],
  telemetryProperties: { [key: string]: string }
): Promise<Result<Void, FxError>> {
  const projectComponents = await commonUtils.getProjectComponents();

  const additionalTelemetryProperties = Object.assign(
    {
      [TelemetryProperty.DebugProjectComponents]: `${projectComponents}`,
      [TelemetryProperty.DebugIsTransparentTask]: "true",
    },
    telemetryProperties
  );
  const checkers = projectOptions.map<NpmInstallCheckerInfo>((p) => {
    const cwdBaseName = path.basename(p.cwd);
    return {
      checker: Checker.NpmInstall,
      cwd: p.cwd,
      args: p.args ?? [],
      forceUpdate: p.forceUpdate,
      component: cwdBaseName,
    };
  });

  const res = await _checkAndInstall(
    npmInstallDisplayMessages,
    [
      {
        info: checkers,
        fastFail: false,
      },
    ],
    additionalTelemetryProperties
  );
  if (res.error) {
    return err(res.error);
  }

  return ok(Void);
}

async function _checkAndInstall(
  displayMessages: DisplayMessages,
  orderedCheckers: PrerequisiteOrderedChecker[],
  additionalTelemetryProperties: { [key: string]: string }
): Promise<{ checkResults: CheckResult[]; error?: FxError }> {
  let progressHelper: ProgressHelper | undefined;
  const checkResults: CheckResult[] = [];
  try {
    const enabledCheckers = parseCheckers(orderedCheckers);

    const localEnvManager = new LocalEnvManager(
      VsCodeLogInstance,
      ExtTelemetry.reporter,
      VS_CODE_UI
    );

    VsCodeLogInstance.outputChannel.show();
    VsCodeLogInstance.info(displayMessages.title);
    VsCodeLogInstance.outputChannel.appendLine("");

    // Get deps
    const depsManager = new DepsManager(vscodeLogger, vscodeTelemetry);

    const step = new Step(enabledCheckers.length);

    VsCodeLogInstance.outputChannel.appendLine(displayMessages.checkNumber(step.totalSteps));
    progressHelper = new ProgressHelper(
      new ProgressHandler(displayMessages.taskName, step.totalSteps)
    );

    await progressHelper.start(
      enabledCheckers.map((v) => {
        const n = v as NpmInstallCheckerInfo;
        return {
          key: v.checker === Checker.NpmInstall ? n.displayName ?? n.cwd : v.checker,
          detail:
            v.checker === Checker.NpmInstall
              ? ProgressMessage[Checker.NpmInstall](n.displayName, n.cwd)
              : ProgressMessage[v.checker],
        };
      })
    );
    VsCodeLogInstance.outputChannel.appendLine("");

    for (const orderedChecker of orderedCheckers) {
      if (Array.isArray(orderedChecker.info)) {
        const orderedCheckerInfoArr = orderedChecker.info as PrerequisiteCheckerInfo[];
        await runWithCheckResultsTelemetry(
          TelemetryEvent.DebugPrereqsInstallPackages,
          ExtensionErrors.PrerequisitesInstallPackagesError,
          additionalTelemetryProperties,
          async () => {
            const checkPromises = [];
            for (const orderedCheckerInfo of orderedCheckerInfoArr) {
              checkPromises.push(
                getCheckPromise(
                  orderedCheckerInfo,
                  depsManager,
                  localEnvManager,
                  step,
                  additionalTelemetryProperties
                ).finally(
                  async () =>
                    await progressHelper?.end(
                      orderedCheckerInfo.checker === Checker.NpmInstall
                        ? orderedCheckerInfo.displayName
                        : orderedCheckerInfo.checker
                    )
                )
              );
            }

            const promiseResults = await Promise.all(checkPromises);
            for (const r of promiseResults) {
              if (r !== undefined) {
                checkResults.push(r);
              }
            }
            return checkResults;
          }
        );
        if (orderedChecker.fastFail) {
          await checkFailure(checkResults, displayMessages, progressHelper);
        }
      } else {
        const orderedCheckerInfo = orderedChecker.info as PrerequisiteCheckerInfo;
        const checkResult = await getCheckPromise(
          orderedCheckerInfo,
          depsManager,
          localEnvManager,
          step,
          additionalTelemetryProperties
        ).finally(
          async () =>
            await progressHelper?.end(
              orderedCheckerInfo.checker === Checker.NpmInstall
                ? orderedCheckerInfo.displayName
                : orderedCheckerInfo.checker
            )
        );
        checkResults.push(checkResult);
        if (orderedChecker.fastFail) {
          await checkFailure(checkResults, displayMessages, progressHelper);
        }
      }
    }
    await handleCheckResults(checkResults, displayMessages, progressHelper);
  } catch (error: unknown) {
    const fxError = assembleError(error);
    await progressHelper?.stop(false);
    return { checkResults: checkResults, error: fxError };
  }
  return { checkResults: checkResults };
}

function getCheckPromise(
  checkerInfo: PrerequisiteCheckerInfo,
  depsManager: DepsManager,
  localEnvManager: LocalEnvManager,
  step: Step,
  additionalTelemetryProperties: { [key: string]: string }
): Promise<CheckResult> {
  switch (checkerInfo.checker) {
    case DepsType.AzureNode:
    case DepsType.SpfxNode:
    case DepsType.LtsNode:
    case DepsType.ProjectNode:
      return checkNode(
        checkerInfo.checker,
        depsManager,
        step.getPrefix(),
        additionalTelemetryProperties
      );
    case Checker.M365Account:
      return checkM365Account(step.getPrefix(), true, additionalTelemetryProperties);
    case Checker.LocalCertificate:
      return resolveLocalCertificate(
        localEnvManager,
        step.getPrefix(),
        additionalTelemetryProperties
      );
    case DepsType.Dotnet:
    case DepsType.FuncCoreTools:
    case DepsType.Ngrok:
      return checkDependency(
        checkerInfo.checker,
        {}, // These dependencies doesn't need installOptions currently
        depsManager,
        step.getPrefix(),
        additionalTelemetryProperties
      );
    case DepsType.VxTestApp:
      return checkDependency(
        checkerInfo.checker,
        {
          version: (checkerInfo as VxTestAppCheckerInfo)?.vxTestApp?.version,
          projectPath: vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath,
        },
        depsManager,
        step.getPrefix(),
        additionalTelemetryProperties
      );
    case Checker.AzureFunctionsExtension:
      return resolveBackendExtension(depsManager, step.getPrefix());
    case Checker.NpmInstall:
      const npmInstalChecherInfo = checkerInfo as NpmInstallCheckerInfo;
      return checkNpmInstall(
        npmInstalChecherInfo.component,
        npmInstalChecherInfo.displayName,
        step.getPrefix(),
        npmInstalChecherInfo.cwd,
        npmInstalChecherInfo.args,
        additionalTelemetryProperties,
        npmInstalChecherInfo.forceUpdate
      );
    case Checker.Ports:
      return checkPort(
        localEnvManager,
        (checkerInfo as PortCheckerInfo)?.ports ?? [],
        `${step.getPrefix()} ${ProgressMessage[Checker.Ports]} ...`,
        additionalTelemetryProperties
      );
  }
}

function parseCheckers(orderedCheckers: PrerequisiteOrderedChecker[]): PrerequisiteCheckerInfo[] {
  const parsedCheckers: PrerequisiteCheckerInfo[] = [];
  for (const orderedChecker of orderedCheckers) {
    if (Array.isArray(orderedChecker.info)) {
      for (const checkerInfo of orderedChecker.info) {
        parsedCheckers.push(checkerInfo);
      }
    } else {
      parsedCheckers.push(orderedChecker.info);
    }
  }
  return parsedCheckers;
}

async function ensureM365Account(
  showLoginPage: boolean
): Promise<Result<{ token: string; tenantId?: string; loginHint?: string }, FxError>> {
  // Check M365 account token
  const m365Result = await localTelemetryReporter.runWithTelemetry(
    TelemetryEvent.DebugPrereqsCheckM365AccountSignIn,
    async (
      ctx: TelemetryContext
    ): Promise<Result<{ token: string; tenantId?: string; loginHint?: string }, FxError>> => {
      const m365Login: M365TokenProvider = M365TokenInstance;
      let loginStatusRes = await m365Login.getStatus({ scopes: AppStudioScopes });
      if (loginStatusRes.isErr()) {
        ctx.properties[TelemetryProperty.DebugM365AccountStatus] = "error";
        return err(loginStatusRes.error);
      }
      ctx.properties[TelemetryProperty.DebugM365AccountStatus] = loginStatusRes.value.status;

      let token = loginStatusRes.value.token;
      let upn = loginStatusRes.value.accountInfo?.upn;
      let tid = loginStatusRes.value.accountInfo?.tid;
      if (loginStatusRes.value.status === signedOut && showLoginPage) {
        const tokenRes = await tools.tokenProvider.m365TokenProvider.getAccessToken({
          scopes: AppStudioScopes,
          showDialog: true,
        });
        if (tokenRes.isErr()) {
          return err(tokenRes.error);
        }
        loginStatusRes = await m365Login.getStatus({ scopes: AppStudioScopes });
        if (loginStatusRes.isErr()) {
          return err(loginStatusRes.error);
        }
        token = loginStatusRes.value.token;
        upn = loginStatusRes.value.accountInfo?.upn;
        tid = loginStatusRes.value.accountInfo?.tid;
      }
      if (token === undefined) {
        // corner case but need to handle
        return err(
          new SystemError(
            ExtensionSource,
            ExtensionErrors.PrerequisitesNoM365AccountError,
            "No Microsoft 365 account login"
          )
        );
      }
      const loginHint = typeof upn === "string" ? upn : undefined;
      const tenantId = typeof tid === "string" ? tid : undefined;
      return ok({ token, tenantId, loginHint });
    }
  );
  if (m365Result.isErr()) {
    return err(m365Result.error);
  }

  // Check sideloading permission
  const sideloadingResult = await localTelemetryReporter.runWithTelemetry(
    TelemetryEvent.DebugPrereqsCheckM365Sideloading,
    async (ctx: TelemetryContext) => {
      const isSideloadingEnabled = await getSideloadingStatus(m365Result.value.token);
      // true, false or undefined for error
      ctx.properties[TelemetryProperty.DebugIsSideloadingAllowed] = `${isSideloadingEnabled}`;
      if (isSideloadingEnabled === false) {
        // sideloading disabled
        return err(
          new UserError(
            ExtensionSource,
            ExtensionErrors.PrerequisitesSideloadingDisabledError,
            getDefaultString("teamstoolkit.accountTree.sideloadingWarningTooltip"),
            localize("teamstoolkit.accountTree.sideloadingWarningTooltip")
          )
        );
      }

      return ok(undefined);
    }
  );
  if (sideloadingResult.isErr()) {
    return err(sideloadingResult.error);
  }

  return m365Result;
}

function checkM365Account(
  prefix: string,
  showLoginPage: boolean,
  additionalTelemetryProperties: { [key: string]: string }
): Promise<CheckResult> {
  return runWithCheckResultTelemetryProperties(
    TelemetryEvent.DebugPrereqsCheckM365Account,
    additionalTelemetryProperties,
    async (): Promise<CheckResult> => {
      let result = ResultStatus.success;
      let error = undefined;
      let loginHint = undefined;
      let tenantId = undefined;
      const failureMsg = Checker.M365Account;
      try {
        VsCodeLogInstance.outputChannel.appendLine(
          `${prefix} ${ProgressMessage[Checker.M365Account]} ...`
        );

        const accountResult = await ensureM365Account(showLoginPage);
        if (accountResult.isErr()) {
          result = ResultStatus.failed;
          error = accountResult.error;
          openAccountHelpHandler();
        } else {
          loginHint = accountResult.value.loginHint;
          tenantId = accountResult.value.tenantId;
        }
      } catch (err: unknown) {
        result = ResultStatus.failed;
        if (!error) {
          error = assembleError(err);
        }
      }

      let hasSwitchedM365Tenant = false;
      if (!isV3Enabled()) {
        const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
        const projectSettings = await localEnvManager.getProjectSettings(
          globalVariables.workspaceUri!.fsPath
        );
        const localEnvInfo = await localEnvManager.getLocalEnvInfo(
          globalVariables.workspaceUri!.fsPath,
          {
            projectId: projectSettings.projectId,
          }
        );

        const tenantIdFromState: string | undefined =
          localEnvInfo?.state?.solution?.teamsAppTenantId ||
          localEnvInfo?.state?.[PluginNames.AAD]?.tenantId ||
          localEnvInfo?.state?.[PluginNames.APPST]?.tenantId;
        if (tenantId && tenantIdFromState && tenantIdFromState !== tenantId) {
          hasSwitchedM365Tenant = true;
          showNotification(
            localize("teamstoolkit.localDebug.switchM365AccountWarning"),
            "https://aka.ms/teamsfx-switch-tenant-or-subscription-help"
          );
        }
      }
      return {
        checker: Checker.M365Account,
        result: result,
        successMsg:
          result && loginHint
            ? hasSwitchedM365Tenant
              ? doctorConstant.SignInSuccessWithNewAccount.split("@account").join(`${loginHint}`)
              : doctorConstant.SignInSuccess.split("@account").join(`${loginHint}`)
            : Checker.M365Account,
        failureMsg: failureMsg,
        error: error,
      };
    }
  );
}

function showNotification(message: string, url: string): void {
  VS_CODE_UI.showMessage(
    "warn",
    message,
    false,
    localize("teamstoolkit.localDebug.learnMore")
  ).then(async (result) => {
    if (result.isOk()) {
      if (result.value === localize("teamstoolkit.localDebug.learnMore")) {
        ExtTelemetry.sendTelemetryEvent(
          TelemetryEvent.ClickLearnMoreWhenSwitchAccountForLocalDebug
        );
        await VS_CODE_UI.openUrl(url);
      }
    }
  });
}

async function checkNode(
  nodeDep: DepsType,
  depsManager: DepsManager,
  prefix: string,
  additionalTelemetryProperties: { [key: string]: string }
): Promise<CheckResult> {
  return await runWithCheckResultTelemetryProperties(
    TelemetryEvent.DebugPrereqsCheckNode,
    additionalTelemetryProperties,
    async () => {
      try {
        VsCodeLogInstance.outputChannel.appendLine(`${prefix} ${ProgressMessage[nodeDep]} ...`);
        const nodeStatus = await depsManager.ensureDependency(nodeDep, true, {
          projectPath: globalVariables.workspaceUri?.fsPath,
        });
        return {
          checker: nodeStatus.name,
          result: nodeStatus.isInstalled
            ? nodeStatus.error
              ? ResultStatus.warn
              : ResultStatus.success
            : ResultStatus.failed,
          successMsg: nodeStatus.isInstalled
            ? doctorConstant.NodeSuccess.split("@Version").join(nodeStatus.details.installVersion)
            : nodeStatus.name,
          failureMsg: nodeStatus.name,
          error: handleDepsCheckerError(nodeStatus.error, nodeStatus),
        };
      } catch (error: unknown) {
        return {
          checker: DepsDisplayName[nodeDep],
          result: ResultStatus.failed,
          successMsg: DepsDisplayName[nodeDep],
          failureMsg: DepsDisplayName[nodeDep],
          error: handleDepsCheckerError(error),
        };
      }
    }
  );
}

async function checkDependency(
  nonNodeDep: DepsType,
  installOptions: InstallOptions,
  depsManager: DepsManager,
  prefix: string,
  additionalTelemetryProperties: { [key: string]: string }
): Promise<CheckResult> {
  try {
    VsCodeLogInstance.outputChannel.appendLine(`${prefix} ${ProgressMessage[nonNodeDep]} ...`);

    const dep = await localTelemetryReporter.runWithTelemetryGeneric(
      TelemetryEvent.DebugPrereqsCheckDependencies,
      async (ctx: TelemetryContext) => {
        ctx.properties[TelemetryProperty.DebugPrereqsDepsType] = nonNodeDep;
        return await depsManager.ensureDependency(nonNodeDep, true, installOptions);
      },
      (result: DependencyStatus) => {
        const error = result.error;
        if (error instanceof DepsCheckerError) {
          // TODO: Currently there is no user/system error info from DepsCheckerError.
          // So assuming UserError for now.
          return new UserError({
            source: ExtensionSource,
            // There is no error code from DepsCheckerError. So use class name for now.
            name: error.constructor.name,
            message: error.message,
            error: error,
          });
        }
        return error !== undefined ? assembleError(error) : undefined;
      },
      additionalTelemetryProperties
    );

    return {
      checker: dep.name,
      result: dep.isInstalled
        ? dep.error
          ? ResultStatus.warn
          : ResultStatus.success
        : ResultStatus.failed,
      successMsg: dep.details.binFolders
        ? doctorConstant.DepsSuccess.replace("@depsName", dep.name).replace(
            "@binFolder",
            dep.details.binFolders?.[0]
          )
        : dep.name,
      error: handleDepsCheckerError(dep.error, dep),
    };
  } catch (error: any) {
    return {
      checker: DepsDisplayName[nonNodeDep],
      result: ResultStatus.failed,
      error: handleDepsCheckerError(error),
    };
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
    const backendRoot = path.join(globalVariables.workspaceUri!.fsPath, FolderName.Function);
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
  prefix: string,
  additionalTelemetryProperties: { [key: string]: string }
): Promise<CheckResult> {
  return await runWithCheckResultTelemetryProperties(
    TelemetryEvent.DebugPrereqsCheckCert,
    additionalTelemetryProperties,
    async (ctx: TelemetryContext) => {
      let result = ResultStatus.success;
      let error = undefined;
      try {
        VsCodeLogInstance.outputChannel.appendLine(
          `${prefix} ${ProgressMessage[Checker.LocalCertificate]} ...`
        );
        const trustDevCert = vscodeHelper.isTrustDevCertEnabled();
        const workspacePath = globalVariables.workspaceUri!.fsPath;
        const localEnvProvider = new LocalEnvProvider(workspacePath);
        const localCertResult = await localEnvManager.resolveLocalCertificate(
          workspacePath,
          trustDevCert,
          localEnvProvider
        );

        // trust cert telemetry properties
        ctx.properties[TelemetryProperty.DebugDevCertStatus] = !trustDevCert
          ? TelemetryDebugDevCertStatus.Disabled
          : localCertResult.alreadyTrusted
          ? TelemetryDebugDevCertStatus.AlreadyTrusted
          : localCertResult.isTrusted
          ? TelemetryDebugDevCertStatus.Trusted
          : TelemetryDebugDevCertStatus.NotTrusted;

        if (typeof localCertResult.isTrusted === "undefined") {
          result = ResultStatus.warn;
          error = new UserError({
            source: ExtensionSource,
            name: "SkipTrustDevCertError",
            helpLink: trustDevCertHelpLink,
            message: "Skip trusting development certificate for localhost.",
          });
        } else if (localCertResult.isTrusted === false) {
          result = ResultStatus.failed;
          error = localCertResult.error;
        }
      } catch (err: unknown) {
        result = ResultStatus.failed;
        error = assembleError(err);
      }
      return {
        checker: Checker.LocalCertificate,
        result: result,
        successMsg: doctorConstant.CertSuccess,
        warnMsg: doctorConstant.Cert,
        failureMsg: doctorConstant.Cert,
        error: error,
      };
    }
  );
}

function handleDepsCheckerError(error: any, dep?: DependencyStatus): FxError {
  if (dep) {
    if (error instanceof NodeNotFoundError) {
      handleNodeNotFoundError(error);
    }
    if (error instanceof NodeNotSupportedError) {
      handleNodeNotSupportedError(error, dep);
    }
    if (error instanceof V3NodeNotSupportedError) {
      handleNodeNotLtsError(error);
    }
    if (error instanceof NodeNotLtsError) {
      handleV3NodeNotSupportedError(error);
    }
  }
  return error instanceof DepsCheckerError
    ? new UserError({
        error,
        source: ExtensionSource,
        name: ExtensionErrors.PrerequisitesValidationError,
        helpLink:
          error instanceof NodeNotSupportedError ? validationSettingsHelpLink : error.helpLink,
      })
    : assembleError(error);
}

function handleNodeNotFoundError(error: NodeNotFoundError) {
  error.message = `${doctorConstant.NodeNotFound}${os.EOL}${doctorConstant.WhiteSpace}${doctorConstant.RestartVSCode}`;
}

function handleNodeNotSupportedError(error: NodeNotSupportedError, dep: DependencyStatus) {
  const supportedVersions = isV3Enabled()
    ? dep.details.supportedVersions.join(", ")
    : dep.details.supportedVersions.map((v) => "v" + v).join(", ");

  error.message = `${doctorConstant
    .NodeNotSupported(isV3Enabled())
    .split("@CurrentVersion")
    .join(dep.details.installVersion)
    .split("@SupportedVersions")
    .join(supportedVersions)}`;

  error.message = `${error.message}${os.EOL}${doctorConstant.WhiteSpace}${doctorConstant.RestartVSCode}`;
}

function handleV3NodeNotSupportedError(error: V3NodeNotSupportedError) {
  error.message = `${error.message}${os.EOL}${doctorConstant.WhiteSpace}${doctorConstant.RestartVSCode}`;
}

function handleNodeNotLtsError(error: V3NodeNotSupportedError) {
  error.message = `${error.message}${os.EOL}${doctorConstant.WhiteSpace}${doctorConstant.RestartVSCode}`;
}

function checkNpmInstall(
  component: string,
  displayName: string | undefined,
  prefix: string,
  folder: string,
  args: string[],
  additionalTelemetryProperties: { [key: string]: string },
  forceUpdate?: boolean
): Promise<CheckResult> {
  const taskName = `${component} npm install`;
  return runWithCheckResultTelemetryProperties(
    TelemetryEvent.DebugPrereqsCheckNpmInstall,
    Object.assign(
      { [TelemetryProperty.DebugNpmInstallName]: taskName },
      additionalTelemetryProperties
    ),
    async (ctx: TelemetryContext) => {
      VsCodeLogInstance.outputChannel.appendLine(
        `${prefix} ${ProgressMessage[Checker.NpmInstall](displayName, folder)} ...`
      );

      if (!(await fs.pathExists(folder))) {
        return {
          checker: Checker.NpmInstall,
          result: ResultStatus.warn,
          successMsg: doctorConstant.NpmInstallSuccess(displayName, folder),
          failureMsg: doctorConstant.NpmInstallFailure(displayName, folder),
          error: new FileNotFoundError(ExtensionSource, folder),
        };
      }

      let installed = false;
      if (!forceUpdate) {
        try {
          installed = await checkNpmDependencies(folder);
        } catch (error: unknown) {
          // treat check error as uninstalled
          await VsCodeLogInstance.warning(`Error when checking npm dependencies: ${error}`);
        }
        ctx.properties[TelemetryProperty.DebugNpmInstallAlreadyInstalled] = installed.toString();
      }

      let result = ResultStatus.success;
      let error = undefined;
      try {
        if (!installed) {
          let exitCode: number | undefined;

          const checkNpmInstallRunning = () => {
            for (const [key, value] of trackedTasks) {
              if (value === taskName) {
                return true;
              }
            }
            return false;
          };
          if (checkNpmInstallRunning()) {
            exitCode = await new Promise((resolve: (value: number | undefined) => void) => {
              const endListener = taskEndEventEmitter.event((result) => {
                if (result.name === taskName) {
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
            const task = new vscode.Task(
              {
                type: "shell",
                command: taskName,
              },
              vscode.workspace.workspaceFolders![0],
              taskName,
              ProductName,
              new vscode.ShellExecution([baseNpmInstallCommand, ...args].join(" "), {
                cwd: folder,
              })
            );
            task.presentationOptions.reveal = vscode.TaskRevealKind.Never;
            exitCode = await runTask(task);
          }
          ctx.properties[TelemetryProperty.DebugNpmInstallExitCode] = `${exitCode}`;

          // check npm dependencies again if exit code not zero
          if (exitCode !== 0 && !(await checkNpmDependencies(folder))) {
            result = ResultStatus.failed;
            error = new UserError(
              ExtensionSource,
              "NpmInstallFailure",
              `Failed to npm install for ${component}`
            );
          }
        }
      } catch (err: any) {
        // treat unexpected error as installed
        error = err;
      }

      return {
        checker: Checker.NpmInstall,
        result: result,
        successMsg: doctorConstant.NpmInstallSuccess(displayName, folder),
        failureMsg: doctorConstant.NpmInstallFailure(displayName, folder),
        error: error,
      };
    }
  );
}

async function handleCheckResults(
  results: CheckResult[],
  displayMessages: DisplayMessages,
  progressHelper?: ProgressHelper,
  fromLocalDebug = true
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
  output.appendLine(displayMessages.summary);

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
    output.appendLine(`${doctorConstant.Exclamation} ${result.warnMsg ?? result.checker} `);
    outputCheckResultError(result, output);
  }

  for (const result of failures) {
    output.appendLine("");
    output.appendLine(`${doctorConstant.Cross} ${result.failureMsg ?? result.checker}`);
    outputCheckResultError(result, output);
  }
  output.appendLine("");
  output.appendLine(displayMessages.learnMore(displayMessages.learnMoreHelpLink));
  output.appendLine("");

  if (fromLocalDebug) {
    if (!shouldStop) {
      if (displayMessages.launchServices) {
        output.appendLine(displayMessages.launchServices);
        output.appendLine("");
      }
      await progressHelper?.stop(true);
    }

    if (shouldStop) {
      await progressHelper?.stop(false);
      const message =
        getDefaultString(displayMessages.errorMessageKey) +
        " " +
        displayMessages.showDetailMessage();

      // show failure summary in display message
      const displayMessage =
        util.format(
          localize("teamstoolkit.localDebug.failedCheckers"),
          failures.map((f) => f.failureMsg ?? f.checker).join(", ")
        ) +
        localize(displayMessages.errorDisplayMessageKey) +
        " " +
        displayMessages.showDetailDisplayMessage();

      const errorOptions: UserErrorOptions = {
        source: ExtensionSource,
        name: displayMessages.errorName,
        message: message,
        displayMessage: displayMessage,
        helpLink: displayMessages.errorHelpLink,
      };
      throw new UserError(errorOptions);
    }
  }
}

function outputCheckResultError(result: CheckResult, output: vscode.OutputChannel) {
  if (result.error) {
    output.appendLine(`${doctorConstant.WhiteSpace}${result.error.message}`);
  }
}

async function checkFailure(
  checkResults: CheckResult[],
  displayMessages: DisplayMessages,
  progressHelper?: ProgressHelper
) {
  if (checkResults.some((r) => r.result === ResultStatus.failed)) {
    await handleCheckResults(checkResults, displayMessages, progressHelper);
  }
}

async function getOrderedCheckers(): Promise<PrerequisiteOrderedChecker[]> {
  const workspacePath = globalVariables.workspaceUri!.fsPath;
  const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter, VS_CODE_UI);
  const projectSettings = await localEnvManager.getProjectSettings(workspacePath);
  const checkers: PrerequisiteOrderedChecker[] = [];
  const parallelCheckers: PrerequisiteCheckerInfo[] = [];
  const activeDeps = await localEnvManager.getActiveDependencies(projectSettings);
  const enabledDeps = await VSCodeDepsChecker.getEnabledDeps(activeDeps);
  const nodeDeps = getNodeDep(enabledDeps);
  const nonNodeDeps = getNonNodeDeps(enabledDeps);
  if (nodeDeps) {
    checkers.push({ info: { checker: nodeDeps }, fastFail: true });
  }
  checkers.push({ info: { checker: Checker.M365Account }, fastFail: false });
  if (ProjectSettingsHelper.includeFrontend(projectSettings)) {
    checkers.push({ info: { checker: Checker.LocalCertificate }, fastFail: false });
  }

  for (let i = 0; i < nonNodeDeps.length - 1; ++i) {
    checkers.push({ info: { checker: nonNodeDeps[i] }, fastFail: false });
  }
  if (nonNodeDeps.length > 0) {
    checkers.push({ info: { checker: nonNodeDeps[nonNodeDeps.length - 1] }, fastFail: true });
  }

  if (ProjectSettingsHelper.isSpfx(projectSettings)) {
    parallelCheckers.push({
      checker: Checker.NpmInstall,
      cwd: path.join(workspacePath, ProjectFolderName[NpmInstallComponent.SPFx]),
      component: NpmInstallComponent.SPFx,
      displayName: NpmInstallDisplayName[NpmInstallComponent.SPFx],
      args: [defaultNpmInstallArg],
    });
  } else {
    if (ProjectSettingsHelper.includeBackend(projectSettings)) {
      parallelCheckers.push({ checker: Checker.AzureFunctionsExtension });
      parallelCheckers.push({
        checker: Checker.NpmInstall,
        component: NpmInstallComponent.Backend,
        displayName: NpmInstallDisplayName[NpmInstallComponent.Backend],
        cwd: path.join(workspacePath, ProjectFolderName[NpmInstallComponent.Backend]),
        args: [defaultNpmInstallArg],
      });
    }

    if (ProjectSettingsHelper.includeBot(projectSettings)) {
      parallelCheckers.push({
        checker: Checker.NpmInstall,
        component: NpmInstallComponent.Bot,
        displayName: NpmInstallDisplayName[NpmInstallComponent.Bot],
        cwd: path.join(workspacePath, ProjectFolderName[NpmInstallComponent.Bot]),
        args: [defaultNpmInstallArg],
      });
    }
    if (ProjectSettingsHelper.includeFrontend(projectSettings)) {
      parallelCheckers.push({
        checker: Checker.NpmInstall,
        component: NpmInstallComponent.Frontend,
        displayName: NpmInstallDisplayName[NpmInstallComponent.Frontend],
        cwd: path.join(workspacePath, ProjectFolderName[NpmInstallComponent.Frontend]),
        args: [defaultNpmInstallArg],
      });
    }
  }
  checkers.push({ info: parallelCheckers, fastFail: true });

  const ports = await localEnvManager.getPortsFromProject(workspacePath, projectSettings);
  checkers.push({ info: { checker: Checker.Ports, ports: ports }, fastFail: false });
  return checkers;
}

async function getOrderedCheckersForGetStarted(): Promise<PrerequisiteOrderedChecker[]> {
  if (isV3Enabled()) {
    const workspacePath = globalVariables.workspaceUri?.fsPath;
    return [
      {
        info: { checker: workspacePath ? DepsType.ProjectNode : DepsType.LtsNode },
        fastFail: false,
      },
    ];
  }

  try {
    const workspacePath = globalVariables.workspaceUri!.fsPath;
    const localEnvManager = new LocalEnvManager(
      VsCodeLogInstance,
      ExtTelemetry.reporter,
      VS_CODE_UI
    );
    const projectSettings = await localEnvManager.getProjectSettings(workspacePath);
    const activeDeps = await localEnvManager.getActiveDependencies(projectSettings);
    const enabledDeps = await VSCodeDepsChecker.getEnabledDeps(activeDeps);

    const nodeDeps = getNodeDep(enabledDeps) ?? DepsType.LtsNode;
    return [{ info: { checker: nodeDeps }, fastFail: false }];
  } catch (error) {
    // not a teamsfx project
    return [{ info: { checker: DepsType.LtsNode }, fastFail: false }];
  }
}

async function getOrderedCheckersForTask(
  prerequisites: string[],
  ports?: number[],
  vxTestApp?: PrerequisiteArgVxTestApp
): Promise<PrerequisiteOrderedChecker[]> {
  const checkers: PrerequisiteOrderedChecker[] = [];
  if (prerequisites.includes(Prerequisite.nodejs)) {
    const localEnvManager = new LocalEnvManager(
      VsCodeLogInstance,
      ExtTelemetry.reporter,
      VS_CODE_UI
    );
    if (isV3Enabled()) {
      checkers.push({ info: { checker: DepsType.ProjectNode }, fastFail: true });
    } else {
      const projectPath = globalVariables.workspaceUri!.fsPath;
      const projectSettings = await localEnvManager.getProjectSettings(projectPath);
      const activeDeps = await localEnvManager.getActiveDependencies(projectSettings);
      const nodeDep = await getNodeDep(activeDeps);
      if (nodeDep) {
        checkers.push({ info: { checker: nodeDep }, fastFail: true });
      }
    }
  }
  if (prerequisites.includes(Prerequisite.m365Account)) {
    checkers.push({ info: { checker: Checker.M365Account }, fastFail: false });
  }
  if (prerequisites.includes(Prerequisite.devCert)) {
    checkers.push({ info: { checker: Checker.LocalCertificate }, fastFail: false });
  }

  const deps: DepsType[] = [];
  if (prerequisites.includes(Prerequisite.func)) {
    deps.push(DepsType.FuncCoreTools);
  }
  if (prerequisites.includes(Prerequisite.ngrok)) {
    deps.push(DepsType.Ngrok);
  }
  if (prerequisites.includes(Prerequisite.dotnet)) {
    deps.push(DepsType.Dotnet);
  }
  const orderedDeps = DepsManager.sortBySequence(deps);

  for (let i = 0; i < orderedDeps.length - 1; ++i) {
    checkers.push({
      info: { checker: orderedDeps[i] },
      fastFail: false,
    });
  }
  if (orderedDeps.length > 0) {
    checkers.push({ info: { checker: orderedDeps[orderedDeps.length - 1] }, fastFail: true });
  }
  if (prerequisites.includes(Prerequisite.vxTestApp)) {
    checkers.push({
      info: { checker: DepsType.VxTestApp, vxTestApp: vxTestApp },
      fastFail: false,
    });
  }

  if (prerequisites.includes(Prerequisite.portOccupancy)) {
    checkers.push({ info: { checker: Checker.Ports, ports: ports }, fastFail: false });
  }
  return checkers;
}

function getDeps(checkerOrDeps: (Checker | DepsType)[]): DepsType[] {
  return checkerOrDeps.map((v) => v as DepsType).filter((v) => Object.values(DepsType).includes(v));
}

function getNodeDep(checkerOrDeps: (Checker | DepsType)[]): DepsType | undefined {
  return getDeps(checkerOrDeps)
    .filter((dep) => VSCodeDepsChecker.getNodeDeps().includes(dep))
    .shift();
}

function getNonNodeDeps(checkerOrDeps: (Checker | DepsType)[]): DepsType[] {
  return getDeps(checkerOrDeps).filter((dep) => !VSCodeDepsChecker.getNodeDeps().includes(dep));
}
