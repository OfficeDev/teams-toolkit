// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// NOTE:
// DO NOT EDIT this file in function plugin.
// The source of truth of this file is in packages/vscode-extension/src/debug/depsChecker.
// If you need to edit this file, please edit it in the above folder
// and run the scripts (tools/depsChecker/copyfiles.sh or tools/depsChecker/copyfiles.ps1 according to your OS)
// to copy you changes to function plugin.

import * as os from "os";
import * as fs from "fs-extra";
import * as path from "path";
import * as child_process from "child_process";
import * as util from "util";
import { ConfigFolderName } from "fx-api";
import {
  cpUtils,
  dotnetCheckerEnabled,
  getResourceDir,
  logger,
  runWithProgressIndicator
} from "./checkerAdapter";
import { DepsInfo, IDepsChecker } from "./checker";
import { dotnetHelpLink, isLinux, isWindows, Messages } from "./common";
import { DepsCheckerEvent, DepsCheckerTelemetry, TelemtryMessages } from "./telemetry";
import { performance } from "perf_hooks";
import { DepsCheckerError } from "./errors";

const exec = util.promisify(child_process.exec);

export enum DotnetVersion {
  v31 = "3.1",
  v50 = "5.0"
}

export const DotnetCoreSDKName = ".NET Core SDK";
export type DotnetSDK = { version: string; path: string };

export const installVersion = DotnetVersion.v31;
export const supportedVersions = [DotnetVersion.v31, DotnetVersion.v50];
const installedNameWithVersion = `${DotnetCoreSDKName} (v${DotnetVersion.v31})`;

export class DotnetChecker implements IDepsChecker {
  private static encoding = "utf-8";
  private static timeout = 3 * 60 * 1000; // same as vscode-dotnet-runtime
  private static maxBuffer = 500 * 1024;

  public async getDepsInfo(): Promise<DepsInfo> {
    const map = new Map<string, string>();
    const execPath = await DotnetChecker.getDotnetExecPathFromConfig();
    if (execPath) {
      map.set("execPath", execPath);
    }
    map.set("configPath", DotnetChecker.getDotnetConfigPath());
    return {
      name: DotnetCoreSDKName,
      installVersion: `${installVersion}`,
      supportedVersions: supportedVersions,
      details: map
    };
  }

  public isEnabled(): Promise<boolean> {
    // TODO: should send this event per user
    // DepsCheckerTelemetry.sendEvent(DepsCheckerEvent.skipCheckDotnet);
    return Promise.resolve(dotnetCheckerEnabled());
  }

  public async isInstalled(): Promise<boolean> {
    logger.debug(`[start] read dotnet path from '${configPath}'`);
    const dotnetPath = await DotnetChecker.getDotnetExecPathFromConfig();
    logger.debug(`[end] read dotnet path from '${configPath}', dotnetPath = '${dotnetPath}'`);

    logger.debug(`[start] check dotnet version`);
    if (dotnetPath !== null && (await DotnetChecker.isDotnetInstalledCorrectly())) {
      return true;
    }
    logger.debug(`[end] check dotnet version`);

    if ((await DotnetChecker.tryAcquireGlobalDotnetSdk()) && (await DotnetChecker.validate())) {
      DepsCheckerTelemetry.sendEvent(DepsCheckerEvent.dotnetAlreadyInstalled);
      logger.info(
        `${Messages.useGlobalDotnet} '${await DotnetChecker.getDotnetExecPathFromConfig()}'`
      );
      return true;
    }

    return false;
  }

  public async install(): Promise<void> {
    logger.debug(`[start] cleanup bin/dotnet and config`);
    await DotnetChecker.cleanup();
    logger.debug(`[end] cleanup bin/dotnet and config`);

    logger.debug(`[start] install dotnet ${installVersion}`);
    logger.info(Messages.downloadDotnet.replace("@NameVersion", installedNameWithVersion));
    await runWithProgressIndicator(async () => {
      await DotnetChecker.handleInstall(installVersion);
    });
    logger.info(Messages.finishInstallDotnet.replace("@NameVersion", installedNameWithVersion));
    logger.debug(`[end] install dotnet ${installVersion}`);

    logger.debug(`[start] validate dotnet version`);
    if (!(await DotnetChecker.validate())) {
      await DotnetChecker.cleanup();
      DepsCheckerTelemetry.sendEvent(DepsCheckerEvent.dotnetInstallError);
      throw new DepsCheckerError(
        Messages.failToInstallDotnet.replace("@NameVersion", installedNameWithVersion),
        dotnetHelpLink
      );
    }
    DepsCheckerTelemetry.sendEvent(DepsCheckerEvent.dotnetInstallCompleted);
  }

  public async getDotnetExecPath(): Promise<string> {
    let dotnetExecPath = "";
    if (await this.isEnabled()) {
      const execPath = await DotnetChecker.getDotnetExecPathFromConfig();
      if (execPath !== null) {
        dotnetExecPath = execPath;
      }
    } else {
      dotnetExecPath = "dotnet";
    }
    return dotnetExecPath;
  }

  public static escapeFilePath(path: string): string {
    if (isWindows()) {
      // Need to escape apostrophes with two apostrophes
      const dotnetInstallDirEscaped = path.replace(/'/g, `''`);

      // Surround with single quotes instead of double quotes (see https://github.com/dotnet/cli/issues/11521)
      return `'${dotnetInstallDirEscaped}'`;
    } else {
      return `"${path}"`;
    }
  }

  private static getDotnetConfigPath(): string {
    return path.join(os.homedir(), `.${ConfigFolderName}`, "dotnet.json");
  }

  private static async getDotnetExecPathFromConfig(): Promise<string | null> {
    try {
      const config = await fs.readJson(DotnetChecker.getDotnetConfigPath(), {
        encoding: DotnetChecker.encoding
      });
      if (typeof config.dotnetExecutablePath === "string") {
        return config.dotnetExecutablePath;
      }
    } catch (error) {
      logger.debug(`get dotnet path failed, error: ${error}`);
    }
    return null;
  }

  private static async handleInstall(version: DotnetVersion): Promise<void> {
    try {
      if (isLinux()) {
        await this.handleLinuxDependency();
      }
      const installDir = DotnetChecker.getDefaultInstallPath();
      // NOTE: we don't need to handle directory creation since dotnet-install script will handle it.
      await DotnetChecker.runDotnetInstallScript(version, installDir);

      logger.debug(`[start] write dotnet path to config`);
      const dotnetExecPath = DotnetChecker.getDotnetExecPathFromDotnetInstallationDir(installDir);
      await DotnetChecker.persistDotnetExecPath(dotnetExecPath);
      logger.debug(`[end] write dotnet path to config`);
    } catch (error) {
      logger.error(
        `${Messages.failToInstallDotnet.replace(
          "@NameVersion",
          installedNameWithVersion
        )}, error = ${error}`
      );
    }
  }

  private static async persistDotnetExecPath(dotnetExecPath: string): Promise<void> {
    const configPath = DotnetChecker.getDotnetConfigPath();
    await fs.ensureFile(configPath);
    await fs.writeJson(
      configPath,
      { dotnetExecutablePath: dotnetExecPath },
      {
        encoding: DotnetChecker.encoding,
        spaces: 4,
        EOL: os.EOL
      }
    );
  }

  private static async handleLinuxDependency(): Promise<void> {
    // do nothing
  }

  private static async cleanup(): Promise<void> {
    await fs.remove(DotnetChecker.getDotnetConfigPath());
    await fs.emptyDir(DotnetChecker.getDefaultInstallPath());
  }

  // from: https://github.com/dotnet/vscode-dotnet-runtime/blob/main/vscode-dotnet-runtime-library/src/Acquisition/AcquisitionInvoker.ts
  private static async runDotnetInstallScript(
    version: DotnetVersion,
    installDir: string
  ): Promise<void> {
    const installCommand: string = await DotnetChecker.getInstallCommand(version, installDir);
    const windowsFullCommand = `powershell.exe -NoProfile -ExecutionPolicy unrestricted -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 ; & ${installCommand} }`;
    const unixFullCommand = `bash ${installCommand}`;

    try {
      const start = performance.now();
      const { stdout, stderr } = await exec(isWindows() ? windowsFullCommand : unixFullCommand, {
        cwd: process.cwd(),
        maxBuffer: DotnetChecker.maxBuffer,
        timeout: DotnetChecker.timeout,
        killSignal: "SIGKILL"
      });
      const timecost = Number(((performance.now() - start) / 1000).toFixed(2));

      if (stderr && stderr.length > 0) {
        DepsCheckerTelemetry.sendSystemErrorEvent(
          DepsCheckerEvent.dotnetInstallScriptError,
          TelemtryMessages.failedToExecDotnetScript,
          `stdout: ${stdout}, stderr: ${stderr}`
        );
        logger.error(
          `${Messages.failToInstallDotnet.replace("@NameVersion", installedNameWithVersion)} ${
            Messages.dotnetInstallStderr
          } stdout: '${stdout}', stderr: '${stderr}'`
        );
      } else {
        DepsCheckerTelemetry.sendEvent(DepsCheckerEvent.dotnetInstallScriptCompleted, timecost);
      }
    } catch (error) {
      DepsCheckerTelemetry.sendSystemErrorEvent(
        DepsCheckerEvent.dotnetInstallScriptError,
        TelemtryMessages.failedToExecDotnetScript,
        error
      );
      // swallow the exception since later validate will find out the errors anyway
      logger.error(
        `${Messages.failToInstallDotnet.replace("@NameVersion", installedNameWithVersion)} ${
          Messages.dotnetInstallErrorCode
        } error: '${error}', stdout = '${error.stdout}', stderr = '${error.stderr}'`
      );
    }
  }

  private static async isDotnetInstalledCorrectly(): Promise<boolean> {
    try {
      const dotnetExecPath = await DotnetChecker.getDotnetExecPathFromConfig();
      const dotnetSdks: DotnetSDK[] = await DotnetChecker.searchDotnetSdks(dotnetExecPath);
      const installedVersions = dotnetSdks
        .map((sdk) => DotnetChecker.parseDotnetVersion(sdk.version))
        .filter((version) => version !== null) as string[];
      return DotnetChecker.isDotnetVersionsInstalled(installedVersions);
    } catch (e) {
      logger.debug(`validate private install failed, err = ${e}`);
      return false;
    }
  }

  private static async isDotnetVersionsInstalled(installedVersions: string[]): Promise<boolean> {
    try {
      const validVersions = DotnetChecker.arrayIntersection(installedVersions, supportedVersions);
      return validVersions.length > 0;
    } catch (exception) {
      logger.error(
        `failed to check .NET, installedVersions = ${installedVersions}, supportedVersions = ${supportedVersions}, exception = '${exception}'`
      );
      return false;
    }
  }

  private static arrayIntersection<T>(lhs: T[], rhs: T[]): T[] {
    return lhs.filter((value) => rhs.includes(value));
  }

  private static isPrivateInstall(sdk: DotnetSDK): boolean {
    const privateInstallPath = DotnetChecker.getDotnetExecPathFromDotnetInstallationDir(
      DotnetChecker.getDefaultInstallPath()
    );
    return path.dirname(privateInstallPath) == path.dirname(sdk.path) && sdk.version !== null;
  }

  private static async getGlobalDotnetSdks(): Promise<DotnetSDK[]> {
    const globalSdks: DotnetSDK[] = await DotnetChecker.searchDotnetSdks("dotnet");
    return globalSdks.filter((sdk) => !DotnetChecker.isPrivateInstall(sdk));
  }

  private static async searchDotnetSdks(dotnetExecPath: string | null): Promise<DotnetSDK[]> {
    if (!dotnetExecPath) {
      return [];
    }
    const sdks: DotnetSDK[] = [];
    try {
      // shell = false to prevent shell escape issues in dotnetExecPath
      const dotnetListSdksOutput = await cpUtils.executeCommand(
        undefined,
        logger,
        { shell: false },
        dotnetExecPath,
        "--list-sdks"
      );

      // dotnet --list-sdks sample output:
      // > 5.0.200 [C:\Program Files\dotnet\sdk]
      // > 3.1.200 [C:\Program Files\dotnet\sdk]
      const regex = /(?<version>\d+\.\d+\.\d+)\s+\[(?<installPath>[^\]]+)\]/;

      // NOTE(aochengwang):
      // for default installation, we expect our dotnet should be installVersion.
      // for user specified dotnet path, check that installVersion exists in any dotnet installation from dotnet --list-sdks.
      dotnetListSdksOutput.split(/\r?\n/).forEach((line: string) => {
        const match = regex.exec(line.trim());
        if (match && match.groups) {
          const path = match.groups.installPath;
          const version = match.groups.version;
          if (DotnetChecker.isFullSdkVersion(version) && path) {
            sdks.push({ version: version, path: path });
          }
        }
      });
    } catch (e) {
      logger.debug(`Failed to search dotnet sdk by dotnetPath = ${dotnetExecPath}`);
    }
    return sdks;
  }

  private static isFullSdkVersion(version: string): boolean {
    const regex = /(?<major_version>\d+)\.(?<minor_version>\d+)\.(?<patch_version>\d+)/gm;
    const match = regex.exec(version);
    return match !== null && match.length > 0;
  }

  private static getDotnetExecPathFromDotnetInstallationDir(installDir: string): string {
    return path.join(installDir, isWindows() ? "dotnet.exe" : "dotnet");
  }

  private static getDotnetInstallScriptPath(): string {
    return path.join(getResourceDir(), isWindows() ? "dotnet-install.ps1" : "dotnet-install.sh");
  }

  private static getDefaultInstallPath(): string {
    return path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "dotnet");
  }

  private static async getInstallCommand(
    version: DotnetVersion,
    dotnetInstallDir: string
  ): Promise<string> {
    const args = [
      "-InstallDir",
      DotnetChecker.escapeFilePath(dotnetInstallDir),
      "-Channel",
      version
    ];

    const scriptPath = DotnetChecker.getDotnetInstallScriptPath();
    return `${DotnetChecker.escapeFilePath(scriptPath)} ${args.join(" ")}`;
  }

  private static async validate(): Promise<boolean> {
    // TODO: validate with dotnet hello world
    const isInstallationValid = await DotnetChecker.isDotnetInstalledCorrectly();
    if (!isInstallationValid) {
      DepsCheckerTelemetry.sendEvent(DepsCheckerEvent.validateDotnetError);
    }
    return isInstallationValid;
  }

  private static async tryAcquireGlobalDotnetSdk(): Promise<boolean> {
    try {
      const sdks: DotnetSDK[] = await DotnetChecker.getGlobalDotnetSdks();
      if (!sdks || sdks.length == 0) {
        return false;
      }
      // todo: by far, use first valid dotnet sdk
      // todo: write dotnetExecPath into user settings instead of into .fx/dotnet.json
      const selectedSdk: DotnetSDK = sdks[0];
      const dotnetExecPath: string = DotnetChecker.getDotnetExecPathFromDotnetInstallationDir(
        path.resolve(selectedSdk.path, "..")
      );
      await DotnetChecker.persistDotnetExecPath(dotnetExecPath);
      return true;
    } catch (e) {
      logger.debug(`Failed to acquire global dotnet sdk, err = ${e}`);
      return false;
    }
  }

  private static parseDotnetVersion(output: string): string | null {
    const regex = /(?<major_version>\d+)\.(?<minor_version>\d+)\.(?<patch_version>\d+)/gm;
    const match = regex.exec(output);
    if (!match) {
      return null;
    }
    return match.groups?.major_version + "." + match.groups?.minor_version;
  }
}

export const dotnetChecker = new DotnetChecker();
