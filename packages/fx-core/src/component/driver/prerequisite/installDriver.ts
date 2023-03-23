// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import { Service } from "typedi";
import { FxError, IProgressHandler, Result } from "@microsoft/teamsfx-api";
import {
  DependencyStatus,
  DepsManager,
  DepsType,
  EmptyLogger,
  EmptyTelemetry,
} from "../../../common/deps-checker";
import {
  LocalCertificate,
  LocalCertificateManager,
} from "../../../common/local/localCertificateManager";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { WrapDriverContext, wrapRun } from "../util/wrapUtil";
import {
  ProgressMessages,
  Summaries,
  TelemetryDepsCheckStatus,
  TelemetryDevCertStatus,
  TelemetryProperties,
  toolsInstallDescription,
} from "./constant";
import { DotnetInstallationUserError } from "./error/dotnetInstallationUserError";
import { FuncInstallationUserError } from "./error/funcInstallationUserError";
import { InstallToolArgs } from "./interfaces/InstallToolArgs";
import { InvalidActionInputError } from "../../../error/common";

const ACTION_NAME = "prerequisite/install";
const outputName = Object.freeze({
  SSL_CRT_FILE: "SSL_CRT_FILE",
  SSL_KEY_FILE: "SSL_KEY_FILE",
  FUNC_PATH: "FUNC_PATH",
  DOTNET_PATH: "DOTNET_PATH",
});
const helpLink = "https://aka.ms/teamsfx-actions/prerequisite-install";

@Service(ACTION_NAME)
export class ToolsInstallDriver implements StepDriver {
  description = toolsInstallDescription();
  async run(
    args: InstallToolArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const wrapContext = new WrapDriverContext(context, ACTION_NAME, ACTION_NAME);

    const impl = new ToolsInstallDriverImpl(wrapContext);
    return (await wrapRun(wrapContext, () => impl.run(args))) as Result<
      Map<string, string>,
      FxError
    >;
  }

  async execute(args: InstallToolArgs, context: DriverContext): Promise<ExecutionResult> {
    const wrapContext = new WrapDriverContext(context, ACTION_NAME, ACTION_NAME);

    const impl = new ToolsInstallDriverImpl(wrapContext);
    return (await wrapRun(wrapContext, () => impl.run(args), true)) as ExecutionResult;
  }
}

export class ToolsInstallDriverImpl {
  constructor(private context: WrapDriverContext) {}

  async run(args: InstallToolArgs): Promise<Map<string, string>> {
    const res = new Map<string, string>();
    this.validateArgs(args);

    this.setArgTelemetry(args);
    const progressBar = await this.createProgressBar(this.getSteps(args));

    if (args.devCert) {
      await progressBar?.next(ProgressMessages.devCert());
      const localCertRes = await this.resolveLocalCertificate(args.devCert.trust);
      localCertRes.forEach((v, k) => res.set(k, v));
    }

    if (args.func) {
      await progressBar?.next(ProgressMessages.func());
      const funcRes = await this.resolveFuncCoreTools();
      funcRes.forEach((v, k) => res.set(k, v));
    }

    if (args.dotnet) {
      await progressBar?.next(ProgressMessages.dotnet());
      const dotnetRes = await this.resolveDotnet();
      dotnetRes.forEach((v, k) => res.set(k, v));
    }

    return res;
  }

  async resolveLocalCertificate(trustDevCert: boolean): Promise<Map<string, string>> {
    const res = new Map<string, string>();
    // Do not print any log in LocalCertificateManager, use the error message returned instead.
    const certManager = new LocalCertificateManager(this.context.ui);
    const localCertResult = await certManager.setupCertificate(trustDevCert);
    if (trustDevCert) {
      res.set(outputName.SSL_CRT_FILE, localCertResult.certPath);
      res.set(outputName.SSL_KEY_FILE, localCertResult.keyPath);
    }

    this.setDevCertTelemetry(trustDevCert, localCertResult);

    if (typeof localCertResult.isTrusted === "undefined") {
      this.context.logProvider.warning(Summaries.devCertSkipped());
      this.context.addSummary(Summaries.devCertSkipped());
    } else if (localCertResult.isTrusted === false) {
      throw localCertResult.error;
    } else {
      this.context.addSummary(Summaries.devCertSuccess(trustDevCert));
    }

    return res;
  }

  async resolveFuncCoreTools(): Promise<Map<string, string>> {
    const res = new Map<string, string>();
    const depsManager = new DepsManager(new EmptyLogger(), new EmptyTelemetry());
    const funcStatus = await depsManager.ensureDependency(DepsType.FuncCoreTools, true);

    this.setDepsCheckTelemetry(TelemetryProperties.funcStatus, funcStatus);

    if (!funcStatus.isInstalled && funcStatus.error) {
      throw new FuncInstallationUserError(ACTION_NAME, funcStatus.error);
    } else if (funcStatus.error) {
      this.context.logProvider.warning(funcStatus.error?.message);
      this.context.addSummary(funcStatus.error?.message);
    } else {
      this.context.addSummary(Summaries.funcSuccess(funcStatus?.details?.binFolders));
    }

    if (funcStatus?.details?.binFolders !== undefined) {
      const funcBinFolder = funcStatus.details.binFolders.join(path.delimiter);
      res.set(outputName.FUNC_PATH, funcBinFolder);
    }
    return res;
  }

  async resolveDotnet(): Promise<Map<string, string>> {
    const res = new Map<string, string>();
    const depsManager = new DepsManager(new EmptyLogger(), new EmptyTelemetry());
    const dotnetStatus = await depsManager.ensureDependency(DepsType.Dotnet, true);

    this.setDepsCheckTelemetry(TelemetryProperties.dotnetStatus, dotnetStatus);

    if (!dotnetStatus.isInstalled && dotnetStatus.error) {
      throw new DotnetInstallationUserError(ACTION_NAME, dotnetStatus.error);
    } else if (dotnetStatus.error) {
      this.context.logProvider.warning(dotnetStatus.error?.message);
      this.context.addSummary(dotnetStatus.error?.message);
    } else {
      this.context.addSummary(Summaries.dotnetSuccess(dotnetStatus?.details?.binFolders));
    }
    if (dotnetStatus?.details?.binFolders !== undefined) {
      const dotnetBinFolder = `${dotnetStatus.details.binFolders
        .map((f: string) => path.dirname(f))
        .join(path.delimiter)}`;
      res.set(outputName.DOTNET_PATH, dotnetBinFolder);
    }
    return res;
  }

  private validateArgs(args: InstallToolArgs): void {
    if (!!args.devCert && typeof args.devCert?.trust !== "boolean") {
      throw new InvalidActionInputError(ACTION_NAME, ["devCert.trust"], helpLink);
    }
    if (!!args.func && typeof args.func !== "boolean") {
      throw new InvalidActionInputError(ACTION_NAME, ["func"], helpLink);
    }
    if (!!args.dotnet && typeof args.dotnet !== "boolean") {
      throw new InvalidActionInputError(ACTION_NAME, ["dotnet"], helpLink);
    }
  }

  private getSteps(args: InstallToolArgs): number {
    return (args.devCert ? 1 : 0) + (args.dotnet ? 1 : 0) + (args.func ? 1 : 0);
  }

  private setArgTelemetry(args: InstallToolArgs): void {
    this.context.addTelemetryProperties({
      [TelemetryProperties.driverArgs]: JSON.stringify({
        devCert: args.devCert,
        func: args.func,
        dotnet: args.dotnet,
      }),
    });
  }

  private setDevCertTelemetry(trustDevCert: boolean, localCertResult: LocalCertificate) {
    this.context.addTelemetryProperties({
      [TelemetryProperties.devCertStatus]: !trustDevCert
        ? TelemetryDevCertStatus.Disabled
        : localCertResult.alreadyTrusted
        ? TelemetryDevCertStatus.AlreadyTrusted
        : localCertResult.isTrusted
        ? TelemetryDevCertStatus.Trusted
        : TelemetryDevCertStatus.NotTrusted,
    });
  }

  private setDepsCheckTelemetry(
    propertyName: typeof TelemetryProperties[keyof typeof TelemetryProperties],
    depStatus: DependencyStatus
  ): void {
    this.context.addTelemetryProperties({
      [propertyName]: depStatus.isInstalled
        ? depStatus.error
          ? TelemetryDepsCheckStatus.warn
          : TelemetryDepsCheckStatus.success
        : TelemetryDepsCheckStatus.failed,
    });
  }

  private async createProgressBar(steps: number): Promise<IProgressHandler | undefined> {
    const progressBar = this.context.ui?.createProgressBar(ProgressMessages.title(), steps);
    if (progressBar) {
      this.context.progressBars.push(progressBar);
    }
    await progressBar?.start();
    return progressBar;
  }
}
