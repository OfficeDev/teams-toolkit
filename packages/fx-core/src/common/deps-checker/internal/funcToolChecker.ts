// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import semver from "semver";
import * as uuid from "uuid";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../localizeUtils";
import { defaultHelpLink, v3NodeNotFoundHelpLink } from "../constant/helpLink";
import { Messages } from "../constant/message";
import { DepsChecker, DepsType, DependencyStatus, FuncInstallOptions } from "../depsChecker";
import { DepsCheckerError, LinuxNotSupportedError, NodeNotFoundError } from "../depsError";
import { DepsLogger } from "../depsLogger";
import { DepsTelemetry } from "../depsTelemetry";
import { cpUtils } from "../util/cpUtils";
import { createSymlink, rename, unlinkSymlink } from "../util/fileHelper";
import { isLinux, isWindows } from "../util/system";
import { NodeChecker } from "./nodeChecker";

type FuncVersion = {
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  versionStr: string;
};

type PortableFuncInstallationStatus = {
  funcVersion: FuncVersion;
  binFolder: string;
};

const funcPackageName = "azure-functions-core-tools";
const funcToolName = "Azure Functions Core Tools";

const timeout = 5 * 60 * 1000;

export class FuncToolChecker implements DepsChecker {
  constructor(logger?: DepsLogger, telemetry?: DepsTelemetry) {
    // TODO: add telemetry
  }

  public async getDepsInfo(
    funcVersion: FuncVersion | null,
    binFolder: string | undefined,
    error?: DepsCheckerError
  ): Promise<DependencyStatus> {
    return Promise.resolve({
      name: funcToolName,
      type: DepsType.FuncCoreTools,
      isInstalled: !!funcVersion,
      command: "func",
      details: {
        isLinuxSupported: false,
        installVersion: funcVersion?.versionStr ?? undefined,
        supportedVersions: [], // TODO: removed this field
        binFolders: binFolder ? [binFolder] : undefined,
      },
      error: error,
    });
  }

  public async resolve(installOptions: FuncInstallOptions): Promise<DependencyStatus> {
    let installationInfo: DependencyStatus;
    try {
      const nodeVersion = await this.getNodeVersion();

      installationInfo = await this.getInstallationInfo(installOptions);
      if (!installationInfo.isInstalled) {
        await this.install(installOptions.version);
        installationInfo = await this.getInstallationInfo(installOptions);
      }

      if (!installationInfo.error && installationInfo.isInstalled) {
        const expectedFuncNodeError = await this.checkExpectedFuncAndNode(
          installOptions.version,
          nodeVersion
        );
        if (expectedFuncNodeError) {
          installationInfo.error = expectedFuncNodeError;
        }
      }

      return installationInfo;
    } catch (error) {
      if (error instanceof DepsCheckerError) {
        return await this.getDepsInfo(null, undefined, error);
      }
      return await this.getDepsInfo(
        null,
        undefined,
        new DepsCheckerError(error.message, defaultHelpLink)
      );
    }
  }

  public async getInstallationInfo(installOptions: FuncInstallOptions): Promise<DependencyStatus> {
    const symlinkPath = this.getSymlinkFuncFolder(installOptions);

    if (symlinkPath) {
      const symlinkFunc = await this.checkFuncVersion(installOptions.version, symlinkPath);
      if (symlinkFunc) {
        return await this.getDepsInfo(symlinkFunc, symlinkPath);
      } else {
        await unlinkSymlink(symlinkPath);
      }
    }

    const portableFunc = await this.checkPortableFuncVersion(installOptions.version);
    if (portableFunc) {
      if (symlinkPath) {
        await createSymlink(portableFunc.binFolder, symlinkPath);
        return await this.getDepsInfo(portableFunc.funcVersion, symlinkPath);
      }
      return await this.getDepsInfo(portableFunc.funcVersion, portableFunc.binFolder);
    }

    const globalFunc = await this.checkFuncVersion(installOptions.version, undefined);
    return await this.getDepsInfo(globalFunc, undefined);
  }

  private async getNodeVersion(): Promise<string> {
    const nodeVersion = (await NodeChecker.getInstalledNodeVersion())?.majorVersion;
    if (!nodeVersion) {
      throw new NodeNotFoundError(Messages.NodeNotFound(), v3NodeNotFoundHelpLink);
    }
    return nodeVersion;
  }

  private async checkExpectedFuncAndNode(
    expectedVersion: string,
    nodeVersion: string
  ): Promise<DepsCheckerError | undefined> {
    // TODO validate expected func version and actual node version
    return undefined;
  }

  public async checkPortableFuncVersion(
    expectedFuncVersion: string
  ): Promise<PortableFuncInstallationStatus | null> {
    try {
      const historyBinFolder = FuncToolChecker.getPortableFuncBinFolder(undefined);
      const historyFunc = await this.checkFuncVersion(expectedFuncVersion, historyBinFolder);
      const maxValidFuncStatus = await this.getMaxPortableFunc(expectedFuncVersion);
      if (
        maxValidFuncStatus &&
        (!historyFunc ||
          semver.gte(maxValidFuncStatus.funcVersion.versionStr, historyFunc.versionStr))
      ) {
        return maxValidFuncStatus;
      } else if (historyFunc) {
        return { funcVersion: historyFunc, binFolder: historyBinFolder };
      }
    } catch {
      // do nothing
    }
    return null;
  }

  private async checkFuncVersion(
    expectedFuncVersion: string,
    binFolder: string | undefined
  ): Promise<FuncVersion | null> {
    try {
      const funcVersion = await this.queryFuncVersion(binFolder);
      // For portable func, avoid "func -v" and "func new" work well, but "func start" fail.
      const hasSentinel = binFolder
        ? await fs.pathExists(FuncToolChecker.getSentinelPath(binFolder))
        : true;
      return !!funcVersion && hasSentinel && isFuncVersionSupport(funcVersion, expectedFuncVersion)
        ? funcVersion
        : null;
    } catch (err) {
      return null;
    }
  }

  private async getMaxPortableFunc(
    expectedFuncVersion: string
  ): Promise<PortableFuncInstallationStatus | null> {
    const files = await fs.readdir(FuncToolChecker.getDefaultInstallPath(), {
      withFileTypes: true,
    });
    const funcDictionaries = files
      .filter((f) => f.isDirectory() && semver.valid(f.name))
      .map((f) => f.name);

    while (funcDictionaries.length > 0) {
      const matchedVersion = semver.maxSatisfying(funcDictionaries, expectedFuncVersion);
      if (!matchedVersion) {
        return null;
      }

      const binFolder = FuncToolChecker.getPortableFuncBinFolder(matchedVersion);
      const actualFunc = await this.checkFuncVersion(expectedFuncVersion, binFolder);

      if (actualFunc?.versionStr === matchedVersion) {
        return {
          funcVersion: actualFunc,
          binFolder: binFolder,
        };
      } // TODO: if not match, will we clean the folder?
      const matchedVersionIndex = funcDictionaries.indexOf(matchedVersion);
      if (matchedVersionIndex < 0) {
        return null;
      }
      funcDictionaries.splice(matchedVersionIndex, 1);
    }
    return null;
  }

  public async install(expectedFuncVersion: string): Promise<void> {
    if (isLinux()) {
      throw new LinuxNotSupportedError(
        Messages.linuxDepsNotFound().split("@SupportedPackages").join(funcToolName),
        defaultHelpLink
      );
    }
    if (!(await this.hasNPM())) {
      throw new DepsCheckerError(Messages.needInstallNpm(), defaultHelpLink);
    }

    const tmpVersion = uuid.v4();
    await this.installFunc(tmpVersion, expectedFuncVersion);

    const funcVersion = await this.checkFuncVersion(
      expectedFuncVersion,
      FuncToolChecker.getPortableFuncBinFolder(tmpVersion)
    );
    if (!funcVersion) {
      await this.cleanup(tmpVersion);
      throw new DepsCheckerError(
        getLocalizedString("error.common.InstallSoftwareError", funcToolName),
        defaultHelpLink
      );
    }

    await rename(
      FuncToolChecker.getFuncInstallPath(tmpVersion),
      FuncToolChecker.getFuncInstallPath(funcVersion.versionStr)
    );
  }

  private static getDefaultInstallPath(): string {
    return path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "azfunc");
  }

  private static getFuncInstallPath(versionStr: string | undefined): string {
    return versionStr
      ? path.join(this.getDefaultInstallPath(), versionStr)
      : path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "func");
  }

  private static getSentinelPath(binFolder: string): string {
    if (path.resolve(binFolder) === FuncToolChecker.getPortableFuncBinFolder(undefined)) {
      // history func sentinel path
      return path.join(os.homedir(), `.${ConfigFolderName}`, "func-sentinel");
    } else {
      return path.join(binFolder, "func-sentinel");
    }
  }

  public static getPortableFuncBinFolder(versionStr: string | undefined): string {
    return path.resolve(
      FuncToolChecker.getFuncInstallPath(versionStr),
      "node_modules",
      "azure-functions-core-tools",
      "bin"
    );
  }

  public getSymlinkFuncFolder(installOptions: FuncInstallOptions): string | undefined {
    return installOptions.symlinkDir
      ? path.join(installOptions.projectPath, installOptions.symlinkDir)
      : undefined;
  }

  private async queryFuncVersion(funcBinFolder: string | undefined): Promise<FuncVersion | null> {
    try {
      const env = funcBinFolder
        ? { PATH: `${funcBinFolder}${path.delimiter}${process.env.PATH}` }
        : undefined;
      const output = await cpUtils.executeCommand(
        undefined,
        undefined,
        // same as backend start, avoid powershell execution policy issue.
        { shell: isWindows() ? "cmd.exe" : true, env },
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
      await cpUtils.executeCommand(undefined, undefined, { shell: true }, "npm", "--version");
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

  private async installFunc(tmpVersion: string, expectedFuncVersion: string): Promise<void> {
    try {
      const tmpFolder = FuncToolChecker.getFuncInstallPath(tmpVersion);
      await cpUtils.executeCommand(
        undefined,
        undefined,
        { timeout: timeout, shell: false },
        this.getExecCommand("npm"),
        "install",
        // not use -f, to avoid npm@6 bug: exit code = 0, even if install fail
        `${funcPackageName}@"${expectedFuncVersion}"`,
        "--prefix",
        `"${tmpFolder}"`,
        "--no-audit"
      );

      await fs.ensureFile(
        FuncToolChecker.getSentinelPath(FuncToolChecker.getPortableFuncBinFolder(tmpVersion))
      );
    } catch (error: unknown) {
      await this.cleanup(tmpVersion);
      // TODO: update error, with internal error message
      throw new DepsCheckerError(
        getLocalizedString("error.common.InstallSoftwareError", funcToolName),
        defaultHelpLink
      );
    }
  }

  private getExecCommand(command: string): string {
    return isWindows() ? `${command}.cmd` : command;
  }
}

export function mapToFuncToolsVersion(output: string): FuncVersion | null {
  const regex = /(?<major_version>\d+)\.(?<minor_version>\d+)\.(?<patch_version>\d+)/gm;
  const match = regex.exec(output);
  if (!match) {
    return null;
  }

  const majorVersion = Number.parseInt(match.groups?.major_version ?? "");
  const minorVersion = Number.parseInt(match.groups?.minor_version ?? "");
  const patchVersion = Number.parseInt(match.groups?.patch_version ?? "");

  if (
    !Number.isInteger(majorVersion) ||
    !Number.isInteger(minorVersion) ||
    !Number.isInteger(patchVersion)
  ) {
    return null;
  }
  return {
    majorVersion: majorVersion,
    minorVersion: minorVersion,
    patchVersion: patchVersion,
    versionStr: `${majorVersion}.${minorVersion}.${patchVersion}`,
  };
}

export function isFuncVersionSupport(
  actualFuncVersion: FuncVersion,
  expectedFuncVersion: string
): boolean {
  return semver.satisfies(actualFuncVersion.versionStr, expectedFuncVersion);
}
