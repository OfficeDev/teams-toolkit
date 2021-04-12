// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import * as fs from "fs-extra";
import * as path from "path";
import * as child_process from "child_process";
import * as util from "util";
import { ConfigFolderName } from "fx-api";
import { logger, cpUtils, runWithProgressIndicator } from "./checkerAdapter";
import { DepsCheckerError } from "./checker";
import { isWindows, isLinux } from "./common";

const exec = util.promisify(child_process.exec);
const helpLink = "https://review.docs.microsoft.com/en-us/mods/?branch=main";

export enum DotnetVersion {
  v31 = "3.1"
}

export const DotnetCoreSDKName = ".NET Core SDK";
export type DotnetSDK = { version: string; path: string };

const installedNameWithVersion = `${DotnetCoreSDKName} (v${DotnetVersion.v31})`;

export class DotnetCheckerImpl {
  private static encoding = "utf-8";
  private static installVersion = DotnetVersion.v31;
  private static supportedVersions = [DotnetVersion.v31];
  private static timeout = 3 * 60 * 1000; // same as vscode-dotnet-runtime
  private static maxBuffer = 500 * 1024;

  public static async isInstalled(): Promise<boolean> {
    // logger.debug(`[start] read dotnet path from '${configPath}'`);
    const dotnetPath = await DotnetCheckerImpl.getDotnetExecPath();
    // logger.debug(`[end] read dotnet path from '${configPath}', dotnetPath = '${dotnetPath}'`);

    // logger.debug(`[start] check dotnet version`);
    if (dotnetPath !== null && (await DotnetCheckerImpl.isDotnetInstalledCorrectly())) {
      return true;
    }
    // logger.debug(`[end] check dotnet version`);

    if ((await DotnetCheckerImpl.tryAcquireGlobalDotnetSdk()) && (await DotnetCheckerImpl.validate())) {
      logger.info(`use global dotnet path = ${await DotnetCheckerImpl.getDotnetExecPath()}`);
      return true;
    }

    return false;
  }

  public static async doInstall(): Promise<void> {
    // logger.debug(`[start] cleanup bin/dotnet and config`);
    await DotnetCheckerImpl.cleanup();
    // logger.debug(`[end] cleanup bin/dotnet and config`);

    // logger.debug(`[start] install dotnet ${DotnetChecker.installVersion}`);
    logger.info(`Downloading and installing ${installedNameWithVersion}.`);
    await runWithProgressIndicator(logger.outputChannel, async () => {
      await DotnetCheckerImpl.install(DotnetCheckerImpl.installVersion);
    });
    logger.info(`Successfully installed ${installedNameWithVersion}.`);
    // logger.debug(`[end] install dotnet ${DotnetChecker.installVersion}`);

    // logger.debug(`[start] validate dotnet version`);
    if (!(await DotnetCheckerImpl.validate())) {
      await DotnetCheckerImpl.cleanup();
      // TODO: remove hardcoding
      throw new DepsCheckerError(`Failed to install ${installedNameWithVersion}.`, helpLink);
    }
  }

  public static async getDotnetExecPath(): Promise<string | null> {
    try {
      const config = await fs.readJson(DotnetCheckerImpl.getDotnetConfigPath(), {
        encoding: DotnetCheckerImpl.encoding
      });
      if (typeof config.dotnetExecutablePath === "string") {
        return config.dotnetExecutablePath;
      }
    } catch (error) {
      // logger.debug(`get dotnet path failed, error: ${error}`);
    }
    return null;
  }

  public static getDotnetConfigPath(): string {
    return path.join(os.homedir(), `.${ConfigFolderName}`, "dotnet.json");
  }

  private static async install(version: DotnetVersion): Promise<void> {
    try {
      if (isLinux()) {
        await this.handleLinuxDependency();
      }
      const installDir = DotnetCheckerImpl.getDefaultInstallPath();
      // NOTE: we don't need to handle directory creation since dotnet-install script will handle it.
      await DotnetCheckerImpl.installDotnet(version, installDir);

      // logger.debug(`[start] write dotnet path to config`);
      const dotnetExecPath = DotnetCheckerImpl.getDotnetExecPathFromDotnetInstallationDir(installDir);
      await DotnetCheckerImpl.persistDotnetExecPath(dotnetExecPath);
      // logger.debug(`[end] write dotnet path to config`);
    } catch (error) {
      logger.error(`Failed to install dotnet, error = ${error}`);
    }
  }

  private static async persistDotnetExecPath(dotnetExecPath: string): Promise<void> {
    const configPath = DotnetCheckerImpl.getDotnetConfigPath();
    await fs.ensureFile(configPath);
    await fs.writeJson(
      configPath,
      { dotnetExecutablePath: dotnetExecPath },
      {
        encoding: DotnetCheckerImpl.encoding,
        spaces: 4,
        EOL: os.EOL
      }
    );
  }

  private static async handleLinuxDependency(): Promise<void> {
    // do nothing
  }

  private static async cleanup(): Promise<void> {
    await fs.remove(DotnetCheckerImpl.getDotnetConfigPath());
    await fs.emptyDir(DotnetCheckerImpl.getDefaultInstallPath());
  }

  // from: https://github.com/dotnet/vscode-dotnet-runtime/blob/main/vscode-dotnet-runtime-library/src/Acquisition/AcquisitionInvoker.ts
  private static async installDotnet(version: DotnetVersion, installDir: string): Promise<void> {
    const installCommand: string = await DotnetCheckerImpl.getInstallCommand(version, installDir);
    const windowsFullCommand = `powershell.exe -NoProfile -ExecutionPolicy unrestricted -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 ; & ${installCommand} }`;
    const unixFullCommand = `bash ${installCommand}`

    try {
      // logger.debug(`[start] exec install script`);
      const { stdout, stderr } = await exec(isWindows() ? windowsFullCommand : unixFullCommand, {
        cwd: process.cwd(),
        maxBuffer: DotnetCheckerImpl.maxBuffer,
        timeout: DotnetCheckerImpl.timeout,
        killSignal: "SIGKILL"
      });
      // logger.debug(`[end] exec install script`);

      if (stderr && stderr.length > 0) {
        logger.error(
          `dotnet-install command failed without error exit code but with non-empty standard error, stdout: '${stdout}', stderr: '${stderr}'`
        );
      }
    } catch (error) {
      // swallow the exception since later validate will find out the errors anyway
      logger.error(
        `dotnet-install command failed, error: '${error}', stdout = '${error.stdout}', stderr = '${error.stderr}'`
      );
    }
  }

  private static async isDotnetInstalledCorrectly(): Promise<boolean> {
    try {
      const dotnetExecPath = await DotnetCheckerImpl.getDotnetExecPath();
      const dotnetSdks: DotnetSDK[] = await DotnetCheckerImpl.searchDotnetSdks(dotnetExecPath);
      const installedVersions = dotnetSdks
        .map((sdk) => DotnetCheckerImpl.parseDotnetVersion(sdk.version))
        .filter((version) => version !== null) as string[];
      return DotnetCheckerImpl.isDotnetVersionsInstalled(installedVersions);
    } catch (e) {
      // logger.debug(`validate private install failed, err = ${e}`);
      return false;
    }
  }

  private static async isDotnetVersionsInstalled(installedVersions: string[]): Promise<boolean> {
    const supportedVersions: string[] = DotnetCheckerImpl.supportedVersions;
    try {
      const validVersions = DotnetCheckerImpl.arrayIntersection(installedVersions, supportedVersions);
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
    const privateInstallPath = DotnetCheckerImpl.getDotnetExecPathFromDotnetInstallationDir(
      DotnetCheckerImpl.getDefaultInstallPath()
    );
    return path.dirname(privateInstallPath) == path.dirname(sdk.path) && sdk.version !== null;
  }

  private static async getGlobalDotnetSdks(): Promise<DotnetSDK[]> {
    const globalSdks: DotnetSDK[] = await DotnetCheckerImpl.searchDotnetSdks("dotnet");
    return globalSdks.filter((sdk) => !DotnetCheckerImpl.isPrivateInstall(sdk));
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
          if (DotnetCheckerImpl.isFullSdkVersion(version) && path) {
            sdks.push({ version: version, path: path });
          }
        }
      });
    } catch (e) {
      // logger.debug(`Failed to search dotnet sdk by dotnetPath = ${dotnetExecPath}`);
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
    return isWindows()
      ? path.join(__dirname, "resource", "dotnet-install.ps1")
      : path.join(__dirname, "resource", "dotnet-install.sh");
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
      DotnetCheckerImpl.escapeFilePath(dotnetInstallDir),
      "-Channel",
      version
    ];

    const scriptPath = DotnetCheckerImpl.getDotnetInstallScriptPath();
    return `${DotnetCheckerImpl.escapeFilePath(scriptPath)} ${args.join(" ")}`;
  }

  private static escapeFilePath(path: string): string {
    if (isWindows()) {
      // Need to escape apostrophes with two apostrophes
      const dotnetInstallDirEscaped = path.replace(/'/g, `''`);

      // Surround with single quotes instead of double quotes (see https://github.com/dotnet/cli/issues/11521)
      return `'${dotnetInstallDirEscaped}'`;
    } else {
      return `"${path}"`;
    }
  }

  private static async validate(): Promise<boolean> {
    // TODO: validate with dotnet hello world
    return await DotnetCheckerImpl.isDotnetInstalledCorrectly();
  }

  private static async tryAcquireGlobalDotnetSdk(): Promise<boolean> {
    try {
      const sdks: DotnetSDK[] = await DotnetCheckerImpl.getGlobalDotnetSdks();
      if (!sdks || sdks.length == 0) {
        return false;
      }
      // todo: by far, use first valid dotnet sdk
      // todo: write dotnetExecPath into user settings instead of into .fx/dotnet.json
      const selectedSdk: DotnetSDK = sdks[0];
      const dotnetExecPath: string = DotnetCheckerImpl.getDotnetExecPathFromDotnetInstallationDir(
        path.resolve(selectedSdk.path, "..")
      );
      await DotnetCheckerImpl.persistDotnetExecPath(dotnetExecPath);
      return true;
    } catch (e) {
      // logger.debug(`Failed to acquire global dotnet sdk, err = ${e}`);
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
