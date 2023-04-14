// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Pengfei Zhao <pengfeizhao@microsoft.com>
 */
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { ConfigFolderName, err, ok, Result } from "@microsoft/teamsfx-api";

import {
  defaultHelpLink,
  functionDepsVersionsLink,
  nodeInstallationLink,
  nodeNotFoundHelpLink,
} from "../constant/helpLink";
import {
  DepsCheckerError,
  LinuxNotSupportedError,
  GlobalFuncNodeNotMatchedError,
  NodeNotFoundError,
  PortableFuncNodeNotMatchedError,
} from "../depsError";
import { cpUtils } from "../util/cpUtils";
import { isLinux, isWindows } from "../util/system";
import { DepsLogger } from "../depsLogger";
import { DepsTelemetry } from "../depsTelemetry";
import { DepsChecker, DependencyStatus, DepsType, FuncInstallOptions } from "../depsChecker";
import { Messages } from "../constant/message";
import { NodeChecker } from "./nodeChecker";
import { getLocalizedString } from "../../localizeUtils";
import semver from "semver";
import * as uuid from "uuid";
import { createSymlink, rename } from "../util/fileHelper";

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

// TODO: remove recommended node version
const RecommendedNodeVersion = "16";

type FuncVersion = {
  majorVersion: FuncMajorVersion;
  minorVersion: number;
  patchVersion: number;
  versionStr: string;
};

// const MinNode18FuncVersion: FuncVersion = {
//   majorVersion: FuncMajorVersion.v4,
//   minorVersion: 0,
//   patchVersion: 4670,
//   versionStr: "4.0.4670",
// };

// type FuncInstallationStatus = {
//   isInstalled: boolean;
//   //funcMajorVersion: FuncMajorVersion | null; // TODO: remove
//   funcVersion: FuncVersion | null;
//   binaryPath: string | null;
// };

type FuncInstallationStatus =
  | {
      isInstalled: true;
      funcVersion: FuncVersion;
      binaryFolder: string;
    }
  | {
      isInstalled: false;
    };
type GlobalFuncInstallationStatus =
  | {
      isInstalled: true;
      funcVersion: FuncVersion;
    }
  | {
      isInstalled: false;
    };

const funcPackageName = "azure-functions-core-tools";
const funcToolName = "Azure Functions Core Tools";

// TODO: remove these hard code v4 func
const installVersion = FuncMajorVersion.v4;
const supportedVersions = [FuncMajorVersion.v4];
const displayFuncName = `${funcToolName} (v${FuncMajorVersion.v4})`;

const timeout = 5 * 60 * 1000;

export class FuncToolChecker implements DepsChecker {
  private readonly _logger?: DepsLogger;
  private readonly _telemetry?: DepsTelemetry;

  constructor(logger: DepsLogger, telemetry: DepsTelemetry) {}

  public async getDepsInfo(
    isPortableFuncInstalled: boolean,
    isGlobalFuncInstalled: boolean,
    outputBinFolder: string | undefined,
    error?: DepsCheckerError
  ): Promise<DependencyStatus> {
    return Promise.resolve({
      name: funcToolName,
      type: DepsType.FuncCoreTools,
      isInstalled: isPortableFuncInstalled || isGlobalFuncInstalled,
      command: "func",
      details: {
        isLinuxSupported: false,
        installVersion: installVersion,
        supportedVersions: supportedVersions,
        binFolders: outputBinFolder ? [outputBinFolder] : undefined,
      },
      error: error,
    });
  }

  public async resolve(installOptions?: FuncInstallOptions): Promise<DependencyStatus> {
    if (!installOptions?.version) {
      // TODO: throw new Error("");
      installOptions = {
        version: "4",
        outputBinFolder: "./devTools",
        projectPath: "D:/code/test/bugbashcommand040701",
      };
    }

    let installationInfo: DependencyStatus & {
      globalFunc: GlobalFuncInstallationStatus;
      portableFunc: FuncInstallationStatus;
    };
    try {
      const nodeVersion = await this.getNodeVersion();
      installationInfo = await this.getInstallationInfo(installOptions);
      if (!installationInfo.isInstalled) {
        // TODO: remove ?? ""
        await this.install(installOptions.version ?? "");
        installationInfo = await this.getInstallationInfo(installOptions);
      }

      if (!installationInfo.error && installationInfo.portableFunc.isInstalled) {
        const portableFuncNodeError = await this.checkPortableFuncAndNode(
          installationInfo.portableFunc.funcVersion,
          nodeVersion
        );
        if (portableFuncNodeError) {
          installationInfo.isInstalled = false;
          installationInfo.error = portableFuncNodeError;
        }
      }

      if (!installationInfo.error && installationInfo.globalFunc.isInstalled) {
        const globalFuncNodeError = await this.checkGlobalFuncAndNode(
          installationInfo.globalFunc.funcVersion,
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
      if (error instanceof DepsCheckerError) {
        return await this.getDepsInfo(false, false, undefined, error);
      }
      return await this.getDepsInfo(
        false,
        false,
        undefined,
        new DepsCheckerError(error.message, defaultHelpLink)
      );
    }

    return installationInfo;
  }

  public async getInstallationInfo(installOptions?: FuncInstallOptions): Promise<
    DependencyStatus & {
      globalFunc: GlobalFuncInstallationStatus;
      portableFunc: FuncInstallationStatus;
    }
  > {
    // TODO: ensure version is input
    if (
      !installOptions?.version ||
      !installOptions.outputBinFolder ||
      !installOptions.projectPath
    ) {
      // TODO: throw new Error("");
      installOptions = {
        version: "4",
        outputBinFolder: "./devTools",
        projectPath: "D:/code/test/bugbashcommand040701",
      };
    }

    // TODO: check the soft linked func
    // TODO: remove ?? ""
    const globalFunc = await this.checkGlobalFuncVersion(installOptions.version ?? "");
    const portableFunc = await this.checkPortableFuncVersion(installOptions.version ?? "");

    if (portableFunc.isInstalled) {
      // TODO: check this line collect or not
      await createSymlink(
        portableFunc.binaryFolder,
        path.join(installOptions.projectPath ?? "", installOptions.outputBinFolder ?? "")
      );
    }

    const depsInfo = await this.getDepsInfo(
      portableFunc.isInstalled,
      globalFunc.isInstalled,
      "TODO: add path"
    ); // TODO: add installed path
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
    portableFunc: FuncVersion,
    nodeVersion: string
  ): Promise<DepsCheckerError | undefined> {
    // TODO: add node 18
    if (portableFunc.majorVersion) {
      if (!FuncNodeVersionWhiteList[portableFunc.majorVersion.toString()]?.[nodeVersion]) {
        return new PortableFuncNodeNotMatchedError(
          Messages.portableFuncNodeNotMatched()
            .split("@FuncVersion")
            .join(`v${portableFunc.majorVersion}`)
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
    globalFunc: FuncVersion,
    nodeVersion: string
  ): Promise<DepsCheckerError | undefined> {
    if (globalFunc.majorVersion) {
      if (!FuncNodeVersionWhiteList[globalFunc.majorVersion.toString()]?.[nodeVersion]) {
        return new GlobalFuncNodeNotMatchedError(
          Messages.globalFuncNodeNotMatched()
            .split("@FuncVersion")
            .join(`v${globalFunc.majorVersion.toString()}`)
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

  private async findValidFuncInDictionary(
    expectedFuncVersion: string
  ): Promise<FuncInstallationStatus> {
    const files = await fs.readdir(FuncToolChecker.getDefaultInstallPath(), {
      withFileTypes: true,
    });
    const funcDictionaries = files
      .filter((f) => f.isDirectory() && semver.valid(f.name))
      .map((f) => f.name);

    while (funcDictionaries.length > 0) {
      const matchedVersion = semver.maxSatisfying(funcDictionaries, expectedFuncVersion);
      if (!matchedVersion) {
        return { isInstalled: false };
      }

      const actualVersion = await this.queryPortableFuncVersion(matchedVersion);
      const binaryFolder = await this.getPortableFuncBinaryFolder(matchedVersion);

      if (actualVersion?.versionStr === matchedVersion && binaryFolder) {
        return { isInstalled: true, funcVersion: actualVersion, binaryFolder: binaryFolder };
      }
      const matchedVersionIndex = funcDictionaries.indexOf(matchedVersion);
      if (matchedVersionIndex < 0) {
        // TODO: matched version should be in the func dictionaries, throw error
        throw new Error("");
      }
      funcDictionaries.splice(matchedVersionIndex, 1);
    }
    return { isInstalled: false };
  }

  private async checkHistoryFunc(expectedFuncVersion: string): Promise<FuncInstallationStatus> {
    const historyFuncVersion = await this.queryPortableFuncVersion(undefined);
    const binaryFolder = await this.getPortableFuncBinaryFolder(undefined);
    return !!historyFuncVersion &&
      isFuncVersionSupport(historyFuncVersion, expectedFuncVersion) &&
      binaryFolder
      ? { isInstalled: true, funcVersion: historyFuncVersion, binaryFolder: binaryFolder }
      : { isInstalled: false };
  }

  public async checkPortableFuncVersion(
    expectedFuncVersion: string
  ): Promise<FuncInstallationStatus> {
    try {
      const historyFuncStatus = await this.checkHistoryFunc(expectedFuncVersion);
      const maxValidFuncStatus = await this.findValidFuncInDictionary(expectedFuncVersion);
      if (
        maxValidFuncStatus.isInstalled &&
        (!historyFuncStatus.isInstalled ||
          semver.gte(
            maxValidFuncStatus.funcVersion.versionStr,
            historyFuncStatus.funcVersion.versionStr
          ))
      ) {
        return maxValidFuncStatus;
      } else if (historyFuncStatus.isInstalled) {
        if (isWindows()) {
          await this.cleanupPortablePs1(historyFuncStatus.funcVersion.versionStr);
        }
        return historyFuncStatus;
      }
    } catch {
      // do nothing
    }
    return {
      isInstalled: false,
    };
  }

  public async checkGlobalFuncVersion(
    expectedFuncVersion: string
  ): Promise<GlobalFuncInstallationStatus> {
    const globalFuncVersion = await this.queryGlobalFuncVersion();
    return globalFuncVersion && isFuncVersionSupport(globalFuncVersion, expectedFuncVersion)
      ? {
          isInstalled: true,
          funcVersion: globalFuncVersion,
        }
      : { isInstalled: false };
  }

  public async install(expectedFuncVersion: string): Promise<void> {
    if (isLinux()) {
      throw new LinuxNotSupportedError(
        Messages.linuxDepsNotFound().split("@SupportedPackages").join(displayFuncName),
        defaultHelpLink
      );
    }
    if (!(await this.hasNPM())) {
      this.handleNpmNotFound();
    }

    // TODO: clean all tmp file
    const tmpVersionStr = await this.installFunc(expectedFuncVersion);
    if (tmpVersionStr.isErr()) {
      // TODO: update error, with internal error message
      throw new DepsCheckerError(
        getLocalizedString("error.common.InstallSoftwareError", displayFuncName),
        defaultHelpLink
      );
    }

    const funcVersion = await this.validate(tmpVersionStr.value, expectedFuncVersion);
    if (!funcVersion) {
      await this.cleanup(tmpVersionStr.value);
      throw new DepsCheckerError(
        getLocalizedString("error.common.InstallSoftwareError", displayFuncName),
        defaultHelpLink
      );
    }

    await rename(
      FuncToolChecker.getFuncInstallPath(tmpVersionStr.value),
      FuncToolChecker.getFuncInstallPath(funcVersion.versionStr)
    );
  }

  private async validate(
    tmpVersionStr: string,
    expectedFuncVersion: string
  ): Promise<FuncVersion | null> {
    try {
      const portableFunc = await this.queryPortableFuncVersion(tmpVersionStr);
      return !!portableFunc && isFuncVersionSupport(portableFunc, expectedFuncVersion)
        ? portableFunc
        : null;
    } catch (err) {
      return null;
    }
  }

  private handleNpmNotFound() {
    throw new DepsCheckerError(
      Messages.needInstallFuncCoreTool().replace("@NameVersion", displayFuncName),
      defaultHelpLink
    );
  }

  private static getDefaultInstallPath(): string {
    return path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "func");
  }

  private static getFuncInstallPath(versionStr: string | undefined): string {
    return versionStr
      ? path.join(this.getDefaultInstallPath(), versionStr)
      : this.getDefaultInstallPath();
  }

  private static getSentinelPath(versionStr: string | undefined): string {
    return versionStr
      ? path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "func", versionStr, "func-sentinel")
      : path.join(os.homedir(), `.${ConfigFolderName}`, "func-sentinel");
  }

  private static getPortableFuncExecPath(versionStr: string | undefined): string {
    return path.join(
      FuncToolChecker.getFuncInstallPath(versionStr),
      "node_modules",
      "azure-functions-core-tools",
      "lib",
      "main.js"
    );
  }

  public getPortableFuncBinFolders(versionStr: string | undefined): string[] {
    return [
      FuncToolChecker.getFuncInstallPath(versionStr), // npm 6 (windows) https://github.com/npm/cli/issues/3489
      path.join(FuncToolChecker.getFuncInstallPath(versionStr), "node_modules", ".bin"),
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

  private async queryPortableFuncVersion(
    versionStr: string | undefined
  ): Promise<FuncVersion | null> {
    try {
      const funcVersion = await this.queryFuncVersion(
        FuncToolChecker.getPortableFuncExecPath(versionStr)
      );
      // to avoid "func -v" and "func new" work well, but "func start" fail.
      const hasSentinel = await fs.pathExists(FuncToolChecker.getSentinelPath(versionStr));
      return hasSentinel ? funcVersion : null;
    } catch {
      return null;
    }
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
      await cpUtils.executeCommand(undefined, this._logger, { shell: true }, "npm", "--version");
      return true;
    } catch (error) {
      return false;
    }
  }

  private async cleanup(tmpVersionStr: string): Promise<void> {
    try {
      await fs.emptyDir(FuncToolChecker.getFuncInstallPath(tmpVersionStr));
    } catch (err) {}
  }

  private async cleanupPortablePs1(VersionStr: string): Promise<void> {
    // delete func.ps1 from portable function
    for (const funcFolder of this.getPortableFuncBinFolders(VersionStr)) {
      const funcPath = path.join(funcFolder, "func.ps1");
      if (await fs.pathExists(funcPath)) {
        await fs.remove(funcPath);
      }
    }
  }

  private async getPortableFuncBinaryFolder(
    versionStr: string | undefined
  ): Promise<string | undefined> {
    for (const funcFolder of this.getPortableFuncBinFolders(versionStr)) {
      // TODO: get func name according to os
      const fileName = isWindows() ? "func.cmd" : "func";
      const funcPath = path.join(funcFolder, fileName);
      if (await fs.pathExists(funcPath)) {
        return funcFolder;
      }
    }
    return undefined;
  }

  // TODO: validate the value of the version
  private async installFunc(expectedFuncVersion: string): Promise<Result<string, Error>> {
    try {
      // TODO: generate a random path, better the tmp path
      const tmpVersion = uuid.v4();
      const tmpFolder = FuncToolChecker.getFuncInstallPath(tmpVersion);

      await cpUtils.executeCommand(
        undefined,
        this._logger,
        { timeout: timeout, shell: false },
        this.getExecCommand("npm"),
        "install",
        // not use -f, to avoid npm@6 bug: exit code = 0, even if install fail
        `${funcPackageName}@${expectedFuncVersion}`,
        "--prefix",
        tmpFolder,
        "--no-audit"
      );

      await this.cleanupPortablePs1(tmpVersion);
      await fs.ensureFile(FuncToolChecker.getSentinelPath(tmpVersion));
      return ok(tmpVersion);
    } catch (error: unknown) {
      return err(error as Error);
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
    versionStr: output,
  };
}

export function isFuncVersionSupport(
  actualFuncVersion: FuncVersion,
  expectedFuncVersion: string
): boolean {
  return semver.satisfies(actualFuncVersion.versionStr, expectedFuncVersion);
}
