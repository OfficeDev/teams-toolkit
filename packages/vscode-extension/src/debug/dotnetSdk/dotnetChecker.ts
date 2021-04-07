// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import * as fs from "fs-extra";
import * as path from "path";
import * as child_process from "child_process";
import * as util from "util";
import { logger, isWindows, isLinux, cpUtils } from "./dotnetCheckerAdapter";

const exec = util.promisify(child_process.exec);

export enum DotnetVersion {
  v31 = "3.1"
}

export type DotnetSDK = { version: string; path: string };

export class DotnetChecker {
  private static encoding = "utf-8";
  private static installVersion = DotnetVersion.v31;
  private static supportedVersions = [DotnetVersion.v31];
  private static timeout = 3 * 60 * 1000; // same as vscode-dotnet-runtime
  private static maxBuffer = 500 * 1024;

  // TODO: make this method returns void and use exception to handle all errors
  public static async ensureDotnet(): Promise<boolean> {
    const configPath = DotnetChecker.getDotnetConfigPath();

    logger.debug(`[start] read dotnet path from '${configPath}'`);
    const dotnetPath = await DotnetChecker.getDotnetExecPath();
    logger.debug(`[end] read dotnet path from '${configPath}', dotnetPath = '${dotnetPath}'`);

    logger.debug(`[start] check dotnet version`);
    if (dotnetPath !== null && (await DotnetChecker.isDotnetInstalledCorrectly())) {
      return true;
    }
    logger.debug(`[end] check dotnet version`);

    if ((await DotnetChecker.tryAcquireGlobalDotnetSdk()) && (await DotnetChecker.validate())) {
      logger.info(`use global dotnet path = ${await DotnetChecker.getDotnetExecPath()}`);
      return true;
    }
    logger.debug(`[start] cleanup bin/dotnet and config`);
    await DotnetChecker.cleanup();
    logger.debug(`[end] cleanup bin/dotnet and config`);

    logger.debug(`[start] install dotnet ${DotnetChecker.installVersion}`);
    await DotnetChecker.install(DotnetChecker.installVersion);
    logger.debug(`[end] install dotnet ${DotnetChecker.installVersion}`);

    logger.debug(`[start] validate dotnet version`);
    if (!(await DotnetChecker.validate())) {
      await DotnetChecker.cleanup();
      return false;
    }
    return true;
  }

  public static async getDotnetExecPath(): Promise<string | null> {
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

  public static getDotnetConfigPath(): string {
    return path.join(os.homedir(), ".mods", "dotnet.json");
  }

  private static async install(version: DotnetVersion): Promise<void> {
    try {
      if (isLinux()) {
        await DotnetChecker.handleLinuxDependency();
      }
      const installDir = DotnetChecker.getDefaultInstallPath();
      // NOTE: we don't need to handle directory creation since dotnet-install script will handle it.
      await DotnetChecker.installDotnet(version, installDir);

      logger.debug(`[start] write dotnet path to config`);
      const dotnetExecPath = DotnetChecker.getDotnetExecPathFromDotnetInstallationDir(installDir);
      await DotnetChecker.persistDotnetExecPath(dotnetExecPath);
      logger.debug(`[end] write dotnet path to config`);
    } catch (error) {
      logger.error(`Failed to install dotnet, error =${error}`);
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
  private static async installDotnet(version: DotnetVersion, installDir: string): Promise<void> {
    const installCommand: string = await DotnetChecker.getInstallCommand(version, installDir);
    const windowsFullCommand = `powershell.exe -NoProfile -ExecutionPolicy unrestricted -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 ; & ${installCommand} }`;

    try {
      logger.debug(`[start] exec install script`);
      const { stdout, stderr } = await exec(isWindows() ? windowsFullCommand : installCommand, {
        cwd: process.cwd(),
        maxBuffer: DotnetChecker.maxBuffer,
        timeout: DotnetChecker.timeout,
        killSignal: "SIGKILL"
      });
      logger.debug(`[end] exec install script`);

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
      const dotnetExecPath = await DotnetChecker.getDotnetExecPath();
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
    const supportedVersions: string[] = DotnetChecker.supportedVersions;
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
    return isWindows()
      ? path.join(__dirname, "resource", "dotnet-install.ps1")
      : path.join(__dirname, "resource", "dotnet-install.sh");
  }

  private static getDefaultInstallPath(): string {
    return path.join(os.homedir(), ".mods", "bin", "dotnet");
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
    return await DotnetChecker.isDotnetInstalledCorrectly();
  }

  private static async tryAcquireGlobalDotnetSdk(): Promise<boolean> {
    try {
      const sdks: DotnetSDK[] = await DotnetChecker.getGlobalDotnetSdks();
      if (!sdks || sdks.length == 0) {
        return false;
      }
      // todo: by far, use first valid dotnet sdk
      // todo: write dotnetExecPath into user settings instead of into .mods/dotnet.json
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
