// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as url from "url";
import semver from "semver";
import * as uuid from "uuid";
import { ConfigFolderName, err, ok, Result } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../localizeUtils";
import { v3DefaultHelpLink, v3NodeNotFoundHelpLink } from "../constant/helpLink";
import { Messages } from "../constant/message";
import { DependencyStatus, DepsChecker, DepsType, TestToolInstallOptions } from "../depsChecker";
import { DepsCheckerError, NodeNotFoundError } from "../depsError";
import { createSymlink, rename, unlinkSymlink, cleanup } from "../util/fileHelper";
import { isWindows } from "../util/system";
import { TelemetryProperties } from "../constant/telemetry";
import { cpUtils } from "../util";

enum InstallType {
  Global = "global",
  Portable = "portable",
}

type TestToolDependencyStatus = Omit<DependencyStatus, "isInstalled"> &
  ({ isInstalled: true; installType: InstallType } | { isInstalled: false });

interface InstallationInfoFile {
  lastCheckTimestamp: number;
}

export class TestToolChecker implements DepsChecker {
  private telemetryProperties: { [key: string]: string };
  private readonly name = "Teams App Test Tool";
  private readonly npmPackageName = "@microsoft/teams-app-test-tool";
  private readonly timeout = 5 * 60 * 1000;
  private readonly checkUpdateTimeout = 10 * 1000;
  private readonly commandName = isWindows() ? "teamsapptester.cmd" : "teamsapptester";
  private readonly portableDirName = "testTool";
  // 7 days
  private readonly defaultUpdateInterval = 7 * 24 * 60 * 60 * 1000;

  constructor() {
    this.telemetryProperties = {};
  }

  public async getInstallationInfo(
    installOptions: TestToolInstallOptions
  ): Promise<TestToolDependencyStatus> {
    const symlinkDir = path.resolve(installOptions.projectPath, installOptions.symlinkDir);

    // check version in project devTools
    const versionRes = await this.checkVersion(
      installOptions.versionRange,
      this.getBinFolder(symlinkDir)
    );
    if (versionRes.isOk()) {
      this.telemetryProperties[TelemetryProperties.SymlinkTestToolVersion] = versionRes.value;
      return await this.getSuccessDepsInfo(versionRes.value, symlinkDir);
    } else {
      this.telemetryProperties[TelemetryProperties.SymlinkTestToolVersionError] =
        versionRes.error.message;
      await unlinkSymlink(symlinkDir);
    }

    // check version in ${HOME}/.fx/bin
    const version = await this.findLatestInstalledPortableVersion(installOptions.versionRange);
    if (version) {
      const portablePath = path.join(this.getPortableVersionsDir(), version);
      this.telemetryProperties[TelemetryProperties.SelectedPortableTestToolVersion] = version;
      await createSymlink(portablePath, symlinkDir);
      return await this.getSuccessDepsInfo(version, symlinkDir);
    }

    // check global version in PATH
    const globalVersionRes = await this.checkVersion(installOptions.versionRange);
    if (globalVersionRes.isOk()) {
      const version = globalVersionRes.value;
      this.telemetryProperties[TelemetryProperties.GlobalTestToolVersion] = version;
      return this.getSuccessDepsInfo(version, undefined);
    } else {
      this.telemetryProperties[TelemetryProperties.GlobalTestToolVersionError] =
        globalVersionRes.error.message;
    }

    return this.createFailureDepsInfo(installOptions.versionRange, undefined);
  }

  public async resolve(installOptions: TestToolInstallOptions): Promise<DependencyStatus> {
    let installationInfo: TestToolDependencyStatus;
    try {
      if (!(await this.hasNode())) {
        throw new NodeNotFoundError(Messages.NodeNotFound(), v3NodeNotFoundHelpLink);
      }
      installationInfo = await this.getInstallationInfo(installOptions);
      if (!installationInfo.isInstalled) {
        const symlinkDir = path.resolve(installOptions.projectPath, installOptions.symlinkDir);
        installationInfo = await this.install(
          installOptions.projectPath,
          installOptions.versionRange,
          symlinkDir
        );
      } else {
        if (installationInfo.installType === InstallType.Portable) {
          const updateInstallationInfo = await this.autoUpdate(installOptions);
          if (updateInstallationInfo) {
            installationInfo = updateInstallationInfo;
          }
        }
      }

      return installationInfo;
    } catch (error: any) {
      if (error instanceof DepsCheckerError) {
        return await this.createFailureDepsInfo(installOptions.versionRange, error);
      }
      return await this.createFailureDepsInfo(
        installOptions.versionRange,
        new DepsCheckerError(error.message, v3DefaultHelpLink)
      );
    }
  }

  private async install(
    projectPath: string,
    versionRange: string,
    symlinkDir: string
  ): Promise<TestToolDependencyStatus> {
    if (!(await this.hasNPM())) {
      throw new DepsCheckerError(Messages.needInstallNpm(), v3DefaultHelpLink);
    }

    const tmpVersion = `tmp-${uuid.v4().slice(0, 6)}`;
    const tmpPath = this.getPortableInstallPath(tmpVersion);
    await this.npmInstall(projectPath, tmpPath, versionRange);
    const versionRes = await this.checkVersion(versionRange, this.getBinFolder(tmpPath));
    if (versionRes.isErr()) {
      await cleanup(tmpPath);
      this.telemetryProperties[TelemetryProperties.InstallTestToolError] = versionRes.error.message;
      throw new DepsCheckerError(
        Messages.failToValidateTestTool(versionRes.error.message),
        v3DefaultHelpLink
      );
    }
    const actualVersion = versionRes.value;
    this.telemetryProperties[TelemetryProperties.InstalledTestToolVersion] = actualVersion;

    const actualPath = this.getPortableInstallPath(actualVersion);
    await rename(tmpPath, actualPath);

    await createSymlink(actualPath, symlinkDir);

    await this.writeInstallInfoFile(projectPath);

    return await this.getSuccessDepsInfo(versionRes.value, symlinkDir);
  }

  private async hasNewVersionReleasedInRange(
    latestInstalledVersion: string,
    versionRange: string
  ): Promise<boolean> {
    try {
      const result = await cpUtils.executeCommand(
        undefined,
        undefined,
        // avoid powershell execution policy issue.
        { shell: isWindows() ? "cmd.exe" : true, timeout: this.checkUpdateTimeout },
        "npm",
        "view",
        `"${this.npmPackageName}@${versionRange}"`,
        "version",
        "--json"
      );
      const versionList: string[] = JSON.parse(result);
      if (!Array.isArray(versionList)) {
        return true;
      }
      return versionList.filter((v) => semver.gt(v, latestInstalledVersion)).length > 0;
    } catch {
      // just a best effort optimization to save one download if no recent version has been released
      // do update if check failed
      return true;
    }
  }

  // return undefined if not updated or update failure
  private async autoUpdate(
    installOptions: TestToolInstallOptions
  ): Promise<TestToolDependencyStatus | undefined> {
    const installInfo = await this.readInstallInfoFile(installOptions.projectPath);
    const now = new Date().getTime();
    const updateExpired =
      !installInfo || now > installInfo.lastCheckTimestamp + this.defaultUpdateInterval;

    if (!updateExpired) {
      return undefined;
    }

    const latestInstalledVersion = await this.findLatestInstalledPortableVersion(
      installOptions.versionRange
    );
    if (
      latestInstalledVersion !== undefined &&
      !(await this.hasNewVersionReleasedInRange(
        latestInstalledVersion,
        installOptions.versionRange
      ))
    ) {
      return undefined;
    }

    this.telemetryProperties[TelemetryProperties.TestToolLastUpdateTimestamp] =
      installInfo?.lastCheckTimestamp?.toString() || "<never>";
    this.telemetryProperties[TelemetryProperties.TestToolUpdatePreviousVersion] =
      latestInstalledVersion || "<undefined>";
    const symlinkDir = path.resolve(installOptions.projectPath, installOptions.symlinkDir);

    try {
      return await this.install(
        installOptions.projectPath,
        installOptions.versionRange,
        symlinkDir
      );
    } catch (e: unknown) {
      // ignore update failure and use existing version
      if (e instanceof Error) {
        this.telemetryProperties[TelemetryProperties.TestToolUpdateError] = e.message;
      }
      await this.writeInstallInfoFile(installOptions.projectPath);
      return undefined;
    }
  }

  private validateInstallInfoFile(data: unknown): data is InstallationInfoFile {
    if ("lastCheckTimestamp" in (data as InstallationInfoFile)) {
      if (typeof (data as InstallationInfoFile).lastCheckTimestamp === "number") {
        return true;
      }
    }

    return false;
  }

  private async readInstallInfoFile(
    projectPath: string
  ): Promise<InstallationInfoFile | undefined> {
    const installInfoPath = this.getInstallInfoPath(projectPath);
    try {
      const data: unknown = await fs.readJson(installInfoPath);
      if (this.validateInstallInfoFile(data)) {
        return data;
      }
    } catch {
      // ignore invalid installation info file
    }
    await cleanup(installInfoPath);
    return undefined;
  }

  private async writeInstallInfoFile(projectPath: string) {
    const projectInfoPath = this.getInstallInfoPath(projectPath);
    const installInfo: InstallationInfoFile = {
      lastCheckTimestamp: new Date().getTime(),
    };
    await fs.ensureDir(path.dirname(projectInfoPath));
    await fs.writeJson(projectInfoPath, installInfo);
  }

  private async findLatestInstalledPortableVersion(
    versionRange: string
  ): Promise<string | undefined> {
    let portablePath: string | undefined;
    try {
      const portableVersionsDir = this.getPortableVersionsDir();
      const dirs = await fs.readdir(portableVersionsDir, { withFileTypes: true });
      const satisfiedVersions = dirs
        .filter(
          (dir) =>
            dir.isDirectory() && semver.valid(dir.name) && semver.satisfies(dir.name, versionRange)
        )
        .map((dir) => dir.name);

      // sort by version desc
      satisfiedVersions.sort((a, b) => semver.rcompare(a, b));

      // find the latest version that is working
      for (const version of satisfiedVersions) {
        portablePath = path.join(portableVersionsDir, version);
        const checkVersionRes = await this.checkVersion(
          versionRange,
          this.getBinFolder(portablePath)
        );
        if (checkVersionRes.isOk()) {
          return version;
        }
        this.telemetryProperties[TelemetryProperties.VersioningFuncVersionError] =
          (this.telemetryProperties[TelemetryProperties.VersioningFuncVersionError] ?? "") +
          `[${version}] ${checkVersionRes.error.message}`;
      }
    } catch {
      // ignore errors if portable dir doesn't exist
    }
    return undefined;
  }

  private async checkVersion(
    versionRange: string,
    binFolder?: string
  ): Promise<Result<string, DepsCheckerError>> {
    try {
      const actualVersion = await this.queryVersion(binFolder);
      if (semver.satisfies(actualVersion, versionRange)) {
        return ok(actualVersion);
      } else {
        return err(
          new DepsCheckerError(
            Messages.testToolVersionNotMatch(actualVersion, versionRange),
            v3DefaultHelpLink
          )
        );
      }
    } catch (error: any) {
      return err(new DepsCheckerError(error.message, v3DefaultHelpLink));
    }
  }

  private async queryVersion(binFolder: string | undefined): Promise<string> {
    const execPath = binFolder ? path.resolve(binFolder, this.commandName) : this.commandName;
    const output = await cpUtils.executeCommand(
      undefined,
      undefined,
      // avoid powershell execution policy issue.
      { shell: isWindows() ? "cmd.exe" : true, timeout: this.timeout },
      `"${execPath}"`,
      "--version"
    );
    return output.trim();
  }

  private async hasNode(): Promise<boolean> {
    try {
      await cpUtils.executeCommand(undefined, undefined, { shell: true }, "node", "--version");
      return true;
    } catch (error) {
      return false;
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

  private async npmInstall(
    projectPath: string,
    prefix: string,
    versionRange: string
  ): Promise<void> {
    let pkg: string | undefined;

    // Before we release package to npm registry we can use tgz to test
    pkg ||= await this.findLocalNpmPackage(projectPath);
    pkg ||= await this.findLocalNpmPackage(path.join(projectPath, "devTools"));

    pkg ||= `${this.npmPackageName}@${versionRange}`;

    try {
      await cpUtils.executeCommand(
        undefined,
        undefined,
        // avoid powershell execution policy issue.
        { shell: isWindows() ? "cmd.exe" : true, timeout: this.timeout },
        `npm`,
        "install",
        `"${pkg}"`,
        "--prefix",
        `"${prefix}"`,
        "--no-audit"
      );
    } catch (error: any) {
      await cleanup(prefix);
      // @ is incorrectly identified as an email format.
      this.telemetryProperties[TelemetryProperties.InstallTestToolError] = (error.message as string)
        ?.split(pkg)
        ?.join(pkg);
      throw new DepsCheckerError(
        getLocalizedString("error.common.InstallSoftwareError", this.name),
        v3DefaultHelpLink
      );
    }
  }

  // TODO: remove after release to npm
  private async findLocalNpmPackage(dir: string): Promise<string | undefined> {
    try {
      const files = await fs.readdir(dir);
      for (const fileName of files) {
        const fullPath = path.join(dir, fileName);
        if (fileName.match(/microsoft-teams-app-test-tool.*\.tgz/i)) {
          try {
            const st = await fs.stat(fullPath);
            if (st.isFile()) {
              // encode special characters in path
              return url.pathToFileURL(fullPath).toString();
            }
          } catch {
            // ignore invalid files
          }
        }
      }
    } catch {
      // local npm package error should not block
    }
    return undefined;
  }

  private getBinFolder(installPath: string) {
    return path.join(installPath, "node_modules", ".bin");
  }
  private getPortableVersionsDir(): string {
    return path.join(os.homedir(), `.${ConfigFolderName}`, "bin", this.portableDirName);
  }
  private getPortableInstallPath(version: string): string {
    return path.join(this.getPortableVersionsDir(), version);
  }
  private getInstallInfoPath(projectDir: string): string {
    return path.join(projectDir, "devTools", ".testTool.installInfo.json");
  }
  private async getSuccessDepsInfo(
    version: string,
    binFolder?: string
  ): Promise<TestToolDependencyStatus> {
    return Promise.resolve({
      name: this.name,
      type: DepsType.TestTool,
      isInstalled: true,
      command: this.commandName,
      details: {
        isLinuxSupported: true,
        supportedVersions: [], // unused
        binFolders: binFolder ? [binFolder] : [],
        installVersion: version,
      },
      telemetryProperties: this.telemetryProperties,
      error: undefined,
      installType: binFolder ? InstallType.Portable : InstallType.Global,
    });
  }
  private async createFailureDepsInfo(
    version: string,
    error?: DepsCheckerError
  ): Promise<TestToolDependencyStatus> {
    return Promise.resolve({
      name: this.name,
      type: DepsType.TestTool,
      isInstalled: false,
      command: this.commandName,
      details: {
        isLinuxSupported: true,
        supportedVersions: [], // unused
        binFolders: [],
        installVersion: version,
      },
      telemetryProperties: this.telemetryProperties,
      error: error,
    });
  }
}
