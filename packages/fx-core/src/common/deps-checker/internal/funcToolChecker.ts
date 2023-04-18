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
import { DependencyStatus, DepsChecker, DepsType, FuncInstallOptions } from "../depsChecker";
import { DepsCheckerError, LinuxNotSupportedError, NodeNotFoundError } from "../depsError";
import { DepsLogger } from "../depsLogger";
import { DepsTelemetry } from "../depsTelemetry";
import { cpUtils } from "../util/cpUtils";
import { createSymlink, rename } from "../util/fileHelper";
import { isLinux, isWindows } from "../util/system";
import { NodeChecker } from "./nodeChecker";

type FuncVersion = {
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  versionStr: string;
};

type FuncInstallationStatus = {
  funcVersion: FuncVersion;
  funcFolder?: string;
};

type GlobalFuncInstallationStatus = {
  funcVersion: FuncVersion;
};

type PortableFuncInstallationStatus = {
  funcVersion: FuncVersion;
  funcFolder: string;
};

const funcPackageName = "azure-functions-core-tools";
const funcToolName = "Azure Functions Core Tools";

const timeout = 5 * 60 * 1000;

export class FuncToolChecker implements DepsChecker {
  constructor(logger?: DepsLogger, telemetry?: DepsTelemetry) {
    // TODO: add telemetry
  }

  public async getDepsInfo(
    installationStatus: FuncInstallationStatus | null,
    error?: DepsCheckerError
  ): Promise<DependencyStatus> {
    return Promise.resolve({
      name: funcToolName,
      type: DepsType.FuncCoreTools,
      isInstalled: !!installationStatus,
      command: "func",
      details: {
        isLinuxSupported: false,
        installVersion: installationStatus?.funcVersion?.versionStr ?? undefined,
        supportedVersions: [], // TODO: removed this field
        binFolders: installationStatus?.funcFolder ? [installationStatus.funcFolder] : undefined,
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
        return await this.getDepsInfo(null, error);
      }
      return await this.getDepsInfo(null, new DepsCheckerError(error.message, defaultHelpLink));
    }
  }

  public async getInstallationInfo(installOptions: FuncInstallOptions): Promise<DependencyStatus> {
    const symlinkPath = this.getSymlinkFuncBinFolder(
      installOptions.projectPath,
      installOptions.symlinkDir
    );

    if (symlinkPath) {
      const symlinkFunc = await this.checkSymlinkedFuncVersion(symlinkPath, installOptions.version);
      if (symlinkFunc) {
        return await this.getDepsInfo(symlinkFunc);
      }
    }
    const portableFunc = await this.checkPortableFuncVersion(installOptions.version);
    if (portableFunc) {
      if (symlinkPath) {
        await createSymlink(portableFunc.funcFolder, symlinkPath);
        portableFunc.funcFolder = symlinkPath;
      }
      return await this.getDepsInfo(portableFunc);
    }

    const globalFunc = await this.checkGlobalFuncVersion(installOptions.version);
    return await this.getDepsInfo(globalFunc);
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

      const actualVersion = await this.queryPortableFuncVersion(matchedVersion);
      const binaryFolder = await this.getPortableFuncBinaryFolder(matchedVersion);

      if (actualVersion?.versionStr === matchedVersion && binaryFolder) {
        return { funcVersion: actualVersion, funcFolder: binaryFolder };
      }
      const matchedVersionIndex = funcDictionaries.indexOf(matchedVersion);
      if (matchedVersionIndex < 0) {
        // TODO: matched version should be in the func dictionaries, throw error
        throw new Error("");
      }
      funcDictionaries.splice(matchedVersionIndex, 1);
    }
    return null;
  }

  private async checkHistoryPortableFunc(
    expectedFuncVersion: string
  ): Promise<PortableFuncInstallationStatus | null> {
    const historyFuncVersion = await this.queryPortableFuncVersion(undefined);
    const binaryFolder = historyFuncVersion
      ? await this.getPortableFuncBinaryFolder(undefined)
      : undefined;

    return !!historyFuncVersion &&
      isFuncVersionSupport(historyFuncVersion, expectedFuncVersion) &&
      binaryFolder
      ? { funcVersion: historyFuncVersion, funcFolder: binaryFolder }
      : null;
  }

  public async checkPortableFuncVersion(
    expectedFuncVersion: string
  ): Promise<PortableFuncInstallationStatus | null> {
    try {
      const historyFuncStatus = await this.checkHistoryPortableFunc(expectedFuncVersion);
      const maxValidFuncStatus = await this.getMaxPortableFunc(expectedFuncVersion);
      if (
        maxValidFuncStatus &&
        (!historyFuncStatus ||
          semver.gte(
            maxValidFuncStatus.funcVersion.versionStr,
            historyFuncStatus.funcVersion.versionStr
          ))
      ) {
        return maxValidFuncStatus;
      } else if (historyFuncStatus) {
        if (isWindows()) {
          await this.cleanupPortablePs1(undefined);
        }
        return historyFuncStatus;
      }
    } catch {
      // do nothing
    }
    return null;
  }

  public async checkGlobalFuncVersion(
    expectedFuncVersion: string
  ): Promise<GlobalFuncInstallationStatus | null> {
    const globalFuncVersion = await this.queryGlobalFuncVersion();
    return globalFuncVersion && isFuncVersionSupport(globalFuncVersion, expectedFuncVersion)
      ? {
          funcVersion: globalFuncVersion,
        }
      : null;
  }

  public async checkSymlinkedFuncVersion(
    symlinkPath: string,
    expectedFuncVersion: string
  ): Promise<PortableFuncInstallationStatus | null> {
    const symlinkFuncVersion = await this.querySymlinkFuncVersion(symlinkPath);
    return symlinkFuncVersion && isFuncVersionSupport(symlinkFuncVersion, expectedFuncVersion)
      ? {
          funcVersion: symlinkFuncVersion,
          funcFolder: symlinkPath,
        }
      : null;
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

    const funcVersion = await this.validate(tmpVersion, expectedFuncVersion);
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

  private static getDefaultInstallPath(): string {
    return path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "azfunc");
  }

  private static getFuncInstallPath(versionStr: string | undefined): string {
    return versionStr
      ? path.join(this.getDefaultInstallPath(), versionStr)
      : path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "func");
  }

  private static getSentinelPath(versionStr: string | undefined): string {
    return versionStr
      ? path.join(this.getFuncInstallPath(versionStr), "func-sentinel")
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

  public async getPortableFuncBinaryFolder(
    versionStr: string | undefined
  ): Promise<string | undefined> {
    for (const funcFolder of this.getPortableFuncBinFolders(versionStr)) {
      const fileName = this.getExecCommand("func");
      const funcPath = path.join(funcFolder, fileName);
      if (await fs.pathExists(funcPath)) {
        return funcFolder;
      }
    }
    return undefined;
  }

  public getSymlinkFuncBinFolder(
    projectPath: string,
    symlinkDir: string | undefined
  ): string | undefined {
    return symlinkDir ? path.join(projectPath, symlinkDir) : undefined;
  }

  private async queryFuncVersion(path: string): Promise<FuncVersion | null> {
    const output = await cpUtils.executeCommand(
      undefined,
      undefined,
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
        undefined,
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

  private async querySymlinkFuncVersion(symlinkFuncBinFolder: string): Promise<FuncVersion | null> {
    try {
      const output = await cpUtils.executeCommand(
        undefined,
        undefined,
        // same as backend start, avoid powershell execution policy issue.
        { shell: isWindows() ? "cmd.exe" : true },
        `"${path.join(symlinkFuncBinFolder, "func")}"`,
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

  private async cleanupPortablePs1(VersionStr: string | undefined): Promise<void> {
    // delete func.ps1 from portable function
    for (const funcFolder of this.getPortableFuncBinFolders(VersionStr)) {
      const funcPath = path.join(funcFolder, "func.ps1");
      if (await fs.pathExists(funcPath)) {
        await fs.remove(funcPath);
      }
    }
  }

  // TODO: validate the value of the version
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
        tmpFolder,
        "--no-audit"
      );

      if (isWindows()) {
        await this.cleanupPortablePs1(tmpVersion);
      }
      await fs.ensureFile(FuncToolChecker.getSentinelPath(tmpVersion));
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
