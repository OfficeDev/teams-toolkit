// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { ConfigFolderName, Result, ok, err } from "@microsoft/teamsfx-api";

import { defaultHelpLink, functionDepsVersionsLink } from "../constant/helpLink";
import { runWithProgressIndicator } from "../util/progressIndicator";
import { DepsCheckerError, LinuxNotSupportedError, FuncNodeNotMatchedError } from "../depsError";
import { cpUtils } from "../util/cpUtils";
import { isLinux, isWindows } from "../util/system";
import { DepsCheckerEvent, TelemtryMessages } from "../constant/telemetry";
import { DepsLogger } from "../depsLogger";
import { DepsTelemetry } from "../depsTelemetry";
import { DepsInfo, DepsChecker } from "../depsChecker";
import { Messages } from "../constant/message";
import { getInstalledNodeVersion } from "./nodeChecker";

export enum FuncVersion {
  v1 = "1",
  v2 = "2",
  v3 = "3",
  v4 = "4",
}

const FuncNodeVersionWhiteList: { [key: string]: { [key: string]: boolean } } = {
  // func-core-tools version
  "3": {
    "10": true, // node version
    "12": true,
    "14": true,
  },
  "4": {
    "14": true,
    "16": true,
  },
};

const funcPackageName = "azure-functions-core-tools";
const funcToolName = "Azure Functions Core Tools";

const installVersion = FuncVersion.v4;
const supportedVersions = [FuncVersion.v4];
const displayFuncName = `${funcToolName} (v${FuncVersion.v4})`;

const timeout = 5 * 60 * 1000;

export class FuncToolChecker implements DepsChecker {
  private readonly _logger: DepsLogger;
  private readonly _telemetry: DepsTelemetry;

  constructor(logger: DepsLogger, telemetry: DepsTelemetry) {
    this._logger = logger;
    this._telemetry = telemetry;
  }

  public async getDepsInfo(): Promise<DepsInfo> {
    return Promise.resolve({
      name: funcToolName,
      isLinuxSupported: false,
      installVersion: installVersion,
      supportedVersions: supportedVersions,
      binFolders: (await this.isPortableFuncInstalled())
        ? this.getPortableFuncBinFolders()
        : undefined,
      details: new Map<string, string>(),
    });
  }

  public async resolve(): Promise<Result<boolean, DepsCheckerError>> {
    try {
      if (!(await this.isInstalled())) {
        await this.install();
      }
    } catch (error) {
      await this._logger.printDetailLog();
      await this._logger.error(`${error.message}, error = '${error}'`);
      if (error instanceof DepsCheckerError) {
        return err(error);
      }
      return err(new DepsCheckerError(error.message, defaultHelpLink));
    } finally {
      this._logger.cleanup();
    }

    const error = await this.checkGlobalFuncAndNode();
    if (error) {
      return err(error);
    }

    return ok(true);
  }

  public async isInstalled(): Promise<boolean> {
    const isGlobalFuncInstalled: boolean = await this.isGlobalFuncInstalled();
    const isPortableFuncInstalled: boolean = await this.isPortableFuncInstalled();

    if (isGlobalFuncInstalled) {
      this._telemetry.sendEvent(DepsCheckerEvent.funcAlreadyInstalled, {
        "global-func-version": `${await this.queryGlobalFuncVersion()}`,
      });
      if (!isPortableFuncInstalled) {
        await this.cleanup();
      }
    }
    if (isPortableFuncInstalled) {
      // avoid missing this event after first installation 60 days
      this._telemetry.sendEvent(DepsCheckerEvent.funcInstallCompleted);
    }

    return isPortableFuncInstalled || isGlobalFuncInstalled;
  }

  private async checkGlobalFuncAndNode(): Promise<FuncNodeNotMatchedError | undefined> {
    const funcVersion = await this.queryGlobalFuncVersion();
    if (!funcVersion) {
      return undefined;
    }
    const nodeVersion = (await getInstalledNodeVersion())?.majorVersion;
    if (!nodeVersion) {
      return undefined;
    }
    if (FuncNodeVersionWhiteList[funcVersion.toString()]![nodeVersion]) {
      return undefined;
    }
    return new FuncNodeNotMatchedError(
      Messages.funcNodeNotMatched
        .split("@FuncVersion")
        .join(`v${funcVersion.toString()}`)
        .split("@NodeVersion")
        .join(`v${nodeVersion}`),
      functionDepsVersionsLink
    );
  }

  public async isPortableFuncInstalled(): Promise<boolean> {
    let isVersionSupported = false,
      hasSentinel = false;
    try {
      const portableFuncVersion = await this.queryFuncVersion(
        FuncToolChecker.getPortableFuncExecPath()
      );
      isVersionSupported =
        portableFuncVersion !== null && supportedVersions.includes(portableFuncVersion);
      // to avoid "func -v" and "func new" work well, but "func start" fail.
      hasSentinel = await fs.pathExists(FuncToolChecker.getSentinelPath());

      if (isWindows() && isVersionSupported && hasSentinel) {
        await this.cleanupPortablePs1();
      }
    } catch (error) {
      // do nothing
      return false;
    }
    return isVersionSupported && hasSentinel;
  }

  public async isGlobalFuncInstalled(): Promise<boolean> {
    const globalFuncVersion = await this.queryGlobalFuncVersion();
    return globalFuncVersion !== null && supportedVersions.includes(globalFuncVersion);
  }

  public async install(): Promise<void> {
    if (isLinux()) {
      throw new LinuxNotSupportedError(defaultHelpLink);
    }
    if (!(await this.hasNPM())) {
      this.handleNpmNotFound();
    }

    await this.cleanup();
    await this.installFunc();

    if (!(await this.validate())) {
      await this.handleInstallFuncFailed();
    }

    this._telemetry.sendEvent(DepsCheckerEvent.funcInstallCompleted);
    await this._logger.info(
      Messages.finishInstallFunctionCoreTool.replace("@NameVersion", displayFuncName)
    );
  }

  private async handleInstallFuncFailed(): Promise<void> {
    await this.cleanup();

    this._telemetry.sendSystemErrorEvent(
      DepsCheckerEvent.funcInstallError,
      TelemtryMessages.failedToInstallFunc,
      Messages.failToValidateFuncCoreTool.replace("@NameVersion", displayFuncName)
    );
    throw new DepsCheckerError(
      Messages.failToInstallFuncCoreTool.split("@NameVersion").join(displayFuncName),
      defaultHelpLink
    );
  }

  private async validate(): Promise<boolean> {
    let isVersionSupported = false;
    let hasSentinel = false;
    try {
      const portableFunc = await this.queryFuncVersion(FuncToolChecker.getPortableFuncExecPath());
      isVersionSupported = portableFunc !== null && supportedVersions.includes(portableFunc);
      // to avoid "func -v" and "func new" work well, but "func start" fail.
      hasSentinel = await fs.pathExists(FuncToolChecker.getSentinelPath());
    } catch (err) {
      this._telemetry.sendSystemErrorEvent(
        DepsCheckerEvent.funcValidationError,
        TelemtryMessages.failedToValidateFunc,
        err
      );
    }

    if (!isVersionSupported || !hasSentinel) {
      this._telemetry.sendEvent(DepsCheckerEvent.funcValidationError, {
        "func-v": String(isVersionSupported),
        sentinel: String(hasSentinel),
      });
    }
    return isVersionSupported && hasSentinel;
  }

  private handleNpmNotFound() {
    this._telemetry.sendEvent(DepsCheckerEvent.npmNotFound);
    throw new DepsCheckerError(
      Messages.needInstallFuncCoreTool.replace("@NameVersion", displayFuncName),
      defaultHelpLink
    );
  }

  private static getDefaultInstallPath(): string {
    return path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "func");
  }

  private static getSentinelPath(): string {
    return path.join(os.homedir(), `.${ConfigFolderName}`, "func-sentinel");
  }

  private static getPortableFuncExecPath(): string {
    return path.join(
      FuncToolChecker.getDefaultInstallPath(),
      "node_modules",
      "azure-functions-core-tools",
      "lib",
      "main.js"
    );
  }

  public async command(): Promise<string> {
    if (await this.isPortableFuncInstalled()) {
      return `node "${FuncToolChecker.getPortableFuncExecPath()}"`;
    }
    if (await this.isGlobalFuncInstalled()) {
      return "func";
    }
    return "npx azure-functions-core-tools@3";
  }

  public getPortableFuncBinFolders(): string[] {
    return [
      FuncToolChecker.getDefaultInstallPath(), // npm 6 (windows) https://github.com/npm/cli/issues/3489
      path.join(FuncToolChecker.getDefaultInstallPath(), "node_modules", ".bin"),
    ];
  }

  private async queryFuncVersion(path: string): Promise<FuncVersion | null> {
    const output = await cpUtils.executeCommand(
      undefined,
      this._logger,
      { shell: true },
      "node",
      `"${path}"`,
      "--version"
    );
    return mapToFuncToolsVersion(output);
  }

  private async queryGlobalFuncVersion(): Promise<FuncVersion | null> {
    try {
      const output = await cpUtils.executeCommand(
        undefined,
        this._logger,
        // same as backend start, avoid powershell execution policy issue.
        { shell: isWindows() ? "cmd.exe" : true },
        "func",
        "--version"
      );
      return mapToFuncToolsVersion(output);
    } catch (error) {
      return null;
    }
  }

  private async hasNPM(): Promise<boolean> {
    try {
      const npmVersion = await cpUtils.executeCommand(
        undefined,
        this._logger,
        { shell: true },
        "npm",
        "--version"
      );
      this._telemetry.sendEvent(DepsCheckerEvent.npmAlreadyInstalled, {
        "npm-version": npmVersion,
      });

      return true;
    } catch (error) {
      this._telemetry.sendEvent(DepsCheckerEvent.npmNotFound);
      return false;
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await fs.emptyDir(FuncToolChecker.getDefaultInstallPath());
      await fs.remove(FuncToolChecker.getSentinelPath());
    } catch (err) {
      await this._logger.debug(
        `Failed to clean up path: ${FuncToolChecker.getDefaultInstallPath()}, error: ${err}`
      );
    }
  }

  private async cleanupPortablePs1(): Promise<void> {
    // delete func.ps1 from portable function
    for (const funcFolder of this.getPortableFuncBinFolders()) {
      const funcPath = path.join(funcFolder, "func.ps1");
      if (await fs.pathExists(funcPath)) {
        await this._logger.debug(`deleting func.ps1 from ${funcPath}`);
        await fs.remove(funcPath);
      }
    }
  }

  private async installFunc(): Promise<void> {
    await this._telemetry.sendEventWithDuration(
      DepsCheckerEvent.funcInstallScriptCompleted,
      async () => {
        await runWithProgressIndicator(
          async () => await this.doInstallPortableFunc(FuncVersion.v4),
          this._logger
        );
      }
    );
  }

  private async doInstallPortableFunc(version: FuncVersion): Promise<void> {
    await this._logger.info(
      Messages.startInstallFunctionCoreTool.replace("@NameVersion", displayFuncName)
    );

    try {
      await cpUtils.executeCommand(
        undefined,
        this._logger,
        { timeout: timeout, shell: false },
        this.getExecCommand("npm"),
        "install",
        // not use -f, to avoid npm@6 bug: exit code = 0, even if install fail
        `${funcPackageName}@${version}`,
        "--prefix",
        `${FuncToolChecker.getDefaultInstallPath()}`,
        "--no-audit"
      );

      await fs.ensureFile(FuncToolChecker.getSentinelPath());

      if (isWindows()) {
        // delete func.ps1 if exists to workaround the powershell execution policy issue:
        // https://github.com/npm/cli/issues/470
        const funcPSScript = await this.getFuncPSScriptPath();
        if (await fs.pathExists(funcPSScript)) {
          await this._logger.debug(`deleting func.ps1 from ${funcPSScript}`);
          await fs.remove(funcPSScript);
        }

        await this.cleanupPortablePs1();
      }
    } catch (error) {
      this._telemetry.sendSystemErrorEvent(
        DepsCheckerEvent.funcInstallScriptError,
        TelemtryMessages.failedToInstallFunc,
        error
      );
    }
  }

  private getExecCommand(command: string): string {
    return isWindows() ? `${command}.cmd` : command;
  }

  private async getFuncPSScriptPath(): Promise<string> {
    try {
      const output = await cpUtils.executeCommand(
        undefined,
        this._logger,
        {
          shell: "cmd.exe",
        },
        "where",
        "func"
      );

      const funcPath = output.split(/\r?\n/)[0];
      const funcFolder = path.dirname(funcPath);

      return path.join(funcFolder, "func.ps1");
    } catch {
      // ignore error and regard func.ps1 as not found.
      return "";
    }
  }
}

export function mapToFuncToolsVersion(output: string): FuncVersion | null {
  const regex = /(?<major_version>\d+)\.(?<minor_version>\d+)\.(?<patch_version>\d+)/gm;
  const match = regex.exec(output);
  if (!match) {
    return null;
  }

  switch (match.groups?.major_version) {
    case FuncVersion.v1:
      return FuncVersion.v1;
    case FuncVersion.v2:
      return FuncVersion.v2;
    case FuncVersion.v3:
      return FuncVersion.v3;
    case FuncVersion.v4:
      return FuncVersion.v4;
    default:
      return null;
  }
}
