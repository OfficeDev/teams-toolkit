// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { ConfigFolderName } from "@microsoft/teamsfx-api";

import {
  defaultHelpLink,
  functionDepsVersionsLink,
  nodeInstallationLink,
  nodeNotFoundHelpLink,
} from "../constant/helpLink";
import { runWithProgressIndicator } from "../util/progressIndicator";
import {
  DepsCheckerError,
  LinuxNotSupportedError,
  GlobalFuncNodeNotMatchedError,
  NodeNotFoundError,
  PortableFuncNodeNotMatchedError,
} from "../depsError";
import { cpUtils } from "../util/cpUtils";
import { isLinux, isWindows } from "../util/system";
import { DepsCheckerEvent, TelemtryMessages } from "../constant/telemetry";
import { DepsLogger } from "../depsLogger";
import { DepsTelemetry } from "../depsTelemetry";
import { DepsChecker, DependencyStatus, DepsType, FuncInstallOptions } from "../depsChecker";
import { Messages } from "../constant/message";
import { NodeChecker } from "./nodeChecker";

export enum FuncMajorVersion {
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
    "18": true,
  },
};

const RecommendedNodeVersion = "16";

interface FuncVersion {
  majorVersion: FuncMajorVersion;
  minorVersion: number;
  patchVersion: number;
}

const MinNode18FuncVersion: FuncVersion = {
  majorVersion: FuncMajorVersion.v4,
  minorVersion: 0,
  patchVersion: 4670,
};

type FuncInstallationStatus = {
  isInstalled: boolean;
  funcVersion: FuncMajorVersion | null;
};

const funcPackageName = "azure-functions-core-tools";
const funcToolName = "Azure Functions Core Tools";

const installVersion = FuncMajorVersion.v4;
const supportedVersions = [FuncMajorVersion.v4];
const displayFuncName = `${funcToolName} (v${FuncMajorVersion.v4})`;

const timeout = 5 * 60 * 1000;

export class FuncToolChecker implements DepsChecker {
  private readonly _logger: DepsLogger;
  private readonly _telemetry: DepsTelemetry;

  constructor(logger: DepsLogger, telemetry: DepsTelemetry) {
    this._logger = logger;
    this._telemetry = telemetry;
  }

  public async getDepsInfo(
    isPortableFuncInstalled: boolean,
    isGlobalFuncInstalled: boolean,
    error?: DepsCheckerError
  ): Promise<DependencyStatus> {
    return Promise.resolve({
      name: funcToolName,
      type: DepsType.FuncCoreTools,
      isInstalled: isPortableFuncInstalled || isGlobalFuncInstalled,
      command: await this.command(isPortableFuncInstalled, isGlobalFuncInstalled),
      details: {
        isLinuxSupported: false,
        installVersion: installVersion,
        supportedVersions: supportedVersions,
        binFolders: isPortableFuncInstalled ? this.getPortableFuncBinFolders() : undefined,
      },
      error: error,
    });
  }

  public async resolve(): Promise<DependencyStatus> {
    let installationInfo: DependencyStatus & {
      globalFunc: FuncInstallationStatus;
      portableFunc: FuncInstallationStatus;
    };
    try {
      const nodeVersion = await this.getNodeVersion();
      installationInfo = await this.getInstallationInfo({ nodeVersion: nodeVersion });
      if (!installationInfo.isInstalled) {
        await this.install(nodeVersion);
        installationInfo = await this.getInstallationInfo({ nodeVersion: nodeVersion });
      }

      if (!installationInfo.error && installationInfo.portableFunc.isInstalled) {
        const portableFuncNodeError = await this.checkPortableFuncAndNode(
          installationInfo.portableFunc,
          nodeVersion
        );
        if (portableFuncNodeError) {
          installationInfo.isInstalled = false;
          installationInfo.error = portableFuncNodeError;
        }
      }

      if (!installationInfo.error) {
        const globalFuncNodeError = await this.checkGlobalFuncAndNode(
          installationInfo.globalFunc,
          nodeVersion
        );
        if (globalFuncNodeError) {
          installationInfo.error = globalFuncNodeError;
          if (
            !installationInfo.portableFunc.isInstalled &&
            installationInfo.globalFunc.isInstalled
          ) {
            installationInfo.isInstalled = false;
          }
        }
      }
    } catch (error) {
      await this._logger.printDetailLog();
      await this._logger.error(`${error.message}, error = '${error}'`);
      if (error instanceof DepsCheckerError) {
        return await this.getDepsInfo(false, false, error);
      }
      return await this.getDepsInfo(
        false,
        false,
        new DepsCheckerError(error.message, defaultHelpLink)
      );
    } finally {
      this._logger.cleanup();
    }

    return installationInfo;
  }

  public async getInstallationInfo(
    installOptions?: FuncInstallOptions
  ): Promise<
    DependencyStatus & { globalFunc: FuncInstallationStatus; portableFunc: FuncInstallationStatus }
  > {
    const nodeVersion = installOptions?.nodeVersion ?? (await this.getNodeVersion());
    const globalFunc = await this.checkGlobalFuncVersion(nodeVersion);
    const isGlobalFuncInstalled = globalFunc.isInstalled;
    const portableFunc = await this.checkPortableFuncVersion(nodeVersion);
    const isPortableFuncInstalled = portableFunc.isInstalled;

    if (isGlobalFuncInstalled) {
      this._telemetry.sendEvent(DepsCheckerEvent.funcAlreadyInstalled, {
        "global-func-version": globalFunc.funcVersion ?? "",
      });
      if (!isPortableFuncInstalled) {
        await this.cleanup();
      }
    }
    if (isPortableFuncInstalled) {
      // avoid missing this event after first installation 60 days
      this._telemetry.sendEvent(DepsCheckerEvent.funcInstallCompleted);
    }

    const depsInfo = await this.getDepsInfo(isPortableFuncInstalled, isGlobalFuncInstalled);
    return Object.assign(depsInfo, { globalFunc: globalFunc, portableFunc: portableFunc });
  }

  private async getNodeVersion(): Promise<string> {
    const nodeVersion = (await NodeChecker.getInstalledNodeVersion())?.majorVersion;
    if (!nodeVersion) {
      throw new NodeNotFoundError(
        Messages.NodeNotFound()
          .split("@NodeVersion")
          .join(supportedVersions[supportedVersions.length - 1]),
        nodeNotFoundHelpLink
      );
    }
    return nodeVersion;
  }

  private async checkPortableFuncAndNode(
    portableFunc: FuncInstallationStatus,
    nodeVersion: string
  ): Promise<DepsCheckerError | undefined> {
    if (portableFunc.funcVersion) {
      if (!FuncNodeVersionWhiteList[portableFunc.funcVersion.toString()]?.[nodeVersion]) {
        return new PortableFuncNodeNotMatchedError(
          Messages.portableFuncNodeNotMatched()
            .split("@FuncVersion")
            .join(`v${portableFunc.funcVersion}`)
            .split("@NodeVersion")
            .join(`v${nodeVersion}`)
            .split("@Link")
            .join(nodeInstallationLink)
            .split("@RecommendedVersion")
            .join(`v${RecommendedNodeVersion}`),
          functionDepsVersionsLink
        );
      }
    }
    return undefined;
  }

  private async checkGlobalFuncAndNode(
    globalFunc: FuncInstallationStatus,
    nodeVersion: string
  ): Promise<DepsCheckerError | undefined> {
    if (globalFunc.funcVersion) {
      if (!FuncNodeVersionWhiteList[globalFunc.funcVersion.toString()]?.[nodeVersion]) {
        return new GlobalFuncNodeNotMatchedError(
          Messages.globalFuncNodeNotMatched()
            .split("@FuncVersion")
            .join(`v${globalFunc.funcVersion.toString()}`)
            .split("@NodeVersion")
            .join(`v${nodeVersion}`)
            .split("@link")
            .join(functionDepsVersionsLink),
          functionDepsVersionsLink
        );
      }
    }
    return undefined;
  }

  public async checkPortableFuncVersion(nodeVersion: string): Promise<FuncInstallationStatus> {
    let isVersionSupported = false,
      hasSentinel = false;
    let portableFuncVersion: FuncVersion | null = null;
    try {
      portableFuncVersion = await this.queryFuncVersion(FuncToolChecker.getPortableFuncExecPath());
      isVersionSupported = isFuncVersionSupport(portableFuncVersion, nodeVersion);
      // to avoid "func -v" and "func new" work well, but "func start" fail.
      hasSentinel = await fs.pathExists(FuncToolChecker.getSentinelPath());

      if (isWindows() && isVersionSupported && hasSentinel) {
        await this.cleanupPortablePs1();
      }
    } catch (error) {
      // do nothing
      return {
        isInstalled: false,
        funcVersion: portableFuncVersion !== null ? portableFuncVersion.majorVersion : null,
      };
    }
    return {
      isInstalled: isVersionSupported && hasSentinel,
      funcVersion: portableFuncVersion !== null ? portableFuncVersion.majorVersion : null,
    };
  }

  public async checkGlobalFuncVersion(nodeVersion: string): Promise<FuncInstallationStatus> {
    const globalFuncVersion = await this.queryGlobalFuncVersion();
    return {
      isInstalled: isFuncVersionSupport(globalFuncVersion, nodeVersion),
      funcVersion: globalFuncVersion !== null ? globalFuncVersion.majorVersion : null,
    };
  }

  public async install(nodeVersion: string): Promise<void> {
    if (isLinux()) {
      throw new LinuxNotSupportedError(
        Messages.linuxDepsNotFound().split("@SupportedPackages").join(displayFuncName),
        defaultHelpLink
      );
    }
    if (!(await this.hasNPM())) {
      this.handleNpmNotFound();
    }

    await this.cleanup();
    await this.installFunc();

    if (!(await this.validate(nodeVersion))) {
      await this.handleInstallFuncFailed();
    }

    this._telemetry.sendEvent(DepsCheckerEvent.funcInstallCompleted);
    await this._logger.info(
      Messages.finishInstallFunctionCoreTool().replace("@NameVersion", displayFuncName)
    );
  }

  private async handleInstallFuncFailed(): Promise<void> {
    await this.cleanup();

    this._telemetry.sendSystemErrorEvent(
      DepsCheckerEvent.funcInstallError,
      TelemtryMessages.failedToInstallFunc,
      Messages.failToValidateFuncCoreTool().replace("@NameVersion", displayFuncName)
    );
    throw new DepsCheckerError(
      Messages.failToInstallFuncCoreTool().split("@NameVersion").join(displayFuncName),
      defaultHelpLink
    );
  }

  private async validate(nodeVersion: string): Promise<boolean> {
    let isVersionSupported = false;
    let hasSentinel = false;
    try {
      const portableFunc = await this.queryFuncVersion(FuncToolChecker.getPortableFuncExecPath());
      isVersionSupported = isFuncVersionSupport(portableFunc, nodeVersion);
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
      Messages.needInstallFuncCoreTool().replace("@NameVersion", displayFuncName),
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

  public async command(
    isPortableFuncInstalled: boolean,
    isGlobalFuncInstalled: boolean
  ): Promise<string> {
    if (isPortableFuncInstalled) {
      return `node "${FuncToolChecker.getPortableFuncExecPath()}"`;
    }
    if (isGlobalFuncInstalled) {
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
          async () => await this.doInstallPortableFunc(FuncMajorVersion.v4),
          this._logger
        );
      }
    );
  }

  private async doInstallPortableFunc(version: FuncMajorVersion): Promise<void> {
    await this._logger.info(
      Messages.startInstallFunctionCoreTool().replace("@NameVersion", displayFuncName)
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

  const majorVersionFunc = (majorVersion: string | undefined) => {
    switch (majorVersion) {
      case FuncMajorVersion.v1:
        return FuncMajorVersion.v1;
      case FuncMajorVersion.v2:
        return FuncMajorVersion.v2;
      case FuncMajorVersion.v3:
        return FuncMajorVersion.v3;
      case FuncMajorVersion.v4:
        return FuncMajorVersion.v4;
      default:
        return null;
    }
  };

  const majorVersion = majorVersionFunc(match.groups?.major_version);
  const minorVersion = Number.parseInt(match.groups?.minor_version ?? "");
  const patchVersion = Number.parseInt(match.groups?.patch_version ?? "");

  if (majorVersion == null || !Number.isInteger(minorVersion) || !Number.isInteger(patchVersion)) {
    return null;
  }
  return {
    majorVersion: majorVersion,
    minorVersion: minorVersion,
    patchVersion: patchVersion,
  };
}

export function isFuncVersionSupport(
  funcVersion: FuncVersion | null,
  nodeVersion: string
): boolean {
  if (Number.parseInt(nodeVersion) >= 18) {
    return (
      funcVersion !== null &&
      funcVersion.majorVersion == MinNode18FuncVersion.majorVersion &&
      (funcVersion.minorVersion > MinNode18FuncVersion.minorVersion ||
        (funcVersion.minorVersion === MinNode18FuncVersion.minorVersion &&
          funcVersion.patchVersion >= MinNode18FuncVersion.patchVersion))
    );
  } else {
    return funcVersion !== null && supportedVersions.includes(funcVersion.majorVersion);
  }
}
