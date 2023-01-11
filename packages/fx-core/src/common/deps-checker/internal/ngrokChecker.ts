// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { ConfigFolderName } from "@microsoft/teamsfx-api";

import { ngrokInstallHelpLink } from "../constant/helpLink";
import { DepsCheckerError } from "../depsError";
import { runWithProgressIndicator } from "../util/progressIndicator";
import { cpUtils } from "../util/cpUtils";
import { isWindows } from "../util/system";
import { DepsCheckerEvent, TelemetryProperties, TelemtryMessages } from "../constant/telemetry";
import { DepsLogger } from "../depsLogger";
import { DepsTelemetry } from "../depsTelemetry";
import { DependencyStatus, DepsChecker, DepsType } from "../depsChecker";
import { Messages } from "../constant/message";

const ngrokName = "ngrok";

const installPackageVersion = "4.3.3";
const supportedPackageVersions = [">=3.4.0"];
const supportedBinVersions = ["2.3"];
const displayNgrokName = `${ngrokName}@${installPackageVersion}`;

const timeout = 5 * 60 * 1000;

export class NgrokChecker implements DepsChecker {
  private readonly _logger: DepsLogger;
  private readonly _telemetry: DepsTelemetry;

  constructor(logger: DepsLogger, telemetry: DepsTelemetry) {
    this._logger = logger;
    this._telemetry = telemetry;
  }

  public async command(): Promise<string> {
    return "ngrok";
  }

  private async getDepsInfo(
    isInstalled: boolean,
    error?: DepsCheckerError
  ): Promise<DependencyStatus> {
    return Promise.resolve({
      name: ngrokName,
      type: DepsType.Ngrok,
      isInstalled: isInstalled,
      command: await this.command(),
      details: {
        isLinuxSupported: true,
        installVersion: installPackageVersion,
        binFolders: [this.getNgrokBinFolder()],
        supportedVersions: supportedPackageVersions,
      },
      error: error,
    });
  }

  public async getInstallationInfo(): Promise<DependencyStatus> {
    let isVersionSupported = false,
      hasSentinel = false;
    try {
      const ngrokVersion = await this.queryNgrokBinVersion();
      isVersionSupported =
        ngrokVersion !== undefined && supportedBinVersions.includes(ngrokVersion);
      hasSentinel = await fs.pathExists(this.getSentinelPath());
    } catch (error) {
      // do nothing
      return await this.getDepsInfo(false);
    }
    return await this.getDepsInfo(isVersionSupported && hasSentinel);
  }

  public async install(): Promise<void> {
    if (!(await this.hasNPM())) {
      this.handleNpmNotFound();
    }

    await this.cleanup();
    await this.installNgrok();

    if (!(await this.validate())) {
      await this.handleInstallNgrokFailed();
    }

    this._telemetry.sendEvent(DepsCheckerEvent.ngrokInstallCompleted);
    await this._logger.info(
      Messages.finishInstallNgrok().replace("@NameVersion", displayNgrokName)
    );
  }

  public getNgrokBinFolder(): string {
    return path.join(this.getDefaultInstallPath(), "node_modules", "ngrok", "bin");
  }

  public async resolve(): Promise<DependencyStatus> {
    try {
      let installationInfo = await this.getInstallationInfo();
      if (!installationInfo.isInstalled) {
        // TODO: show output in extension
        // this._adapter.showOutputChannel();
        await this.install();
        installationInfo = await this.getInstallationInfo();
        this._logger.cleanup();
      }
      return installationInfo;
    } catch (error) {
      await this._logger.printDetailLog();
      this._logger.cleanup();
      await this._logger.error(`Failed to install 'ngrok', error = '${error}'`);
      if (error instanceof DepsCheckerError) {
        return await this.getDepsInfo(false, error);
      }
      return await this.getDepsInfo(
        false,
        new DepsCheckerError(error.message, ngrokInstallHelpLink)
      );
    }
  }

  private async handleInstallNgrokFailed(): Promise<void> {
    await this.cleanup();

    this._telemetry.sendSystemErrorEvent(
      DepsCheckerEvent.ngrokInstallError,
      TelemtryMessages.failedToInstallNgrok,
      Messages.failToValidateNgrok().replace("@NameVersion", displayNgrokName)
    );
    throw new DepsCheckerError(
      Messages.failToInstallNgrok().split("@NameVersion").join(displayNgrokName),
      ngrokInstallHelpLink
    );
  }

  private async validate(): Promise<boolean> {
    let isVersionSupported = false;
    let hasSentinel = false;
    try {
      const binVersion = await this.queryNgrokBinVersion();
      isVersionSupported = binVersion !== undefined && supportedBinVersions.includes(binVersion);
      hasSentinel = await fs.pathExists(this.getSentinelPath());
    } catch (err) {
      this._telemetry.sendSystemErrorEvent(
        DepsCheckerEvent.ngrokValidationError,
        TelemtryMessages.failedToValidateNgrok,
        err
      );
    }

    if (!isVersionSupported || !hasSentinel) {
      this._telemetry.sendEvent(DepsCheckerEvent.ngrokValidationError, {
        "ngrok-v": String(isVersionSupported),
        sentinel: String(hasSentinel),
      });
    }
    return isVersionSupported && hasSentinel;
  }

  private handleNpmNotFound() {
    this._telemetry.sendEvent(DepsCheckerEvent.npmNotFound);
    throw new DepsCheckerError(
      Messages.needInstallNgrok().replace("@NameVersion", displayNgrokName),
      ngrokInstallHelpLink
    );
  }

  private getDefaultInstallPath(): string {
    return path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "ngrok");
  }

  private getSentinelPath(): string {
    return path.join(os.homedir(), `.${ConfigFolderName}`, "ngrok-sentinel");
  }

  private async queryNgrokBinVersion(): Promise<string | undefined> {
    const output = await cpUtils.executeCommand(
      undefined,
      this._logger,
      {
        shell: true,
        env: { PATH: this.getNgrokBinFolder() },
      },
      ngrokName,
      "version"
    );

    const regex =
      /ngrok version (?<major_version>\d+)\.(?<minor_version>\d+)\.(?<patch_version>\d+)/gim;
    const match = regex.exec(output);

    if (!match || !match.groups) {
      return undefined;
    }

    return `${match.groups.major_version}.${match.groups.minor_version}`;
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
      await fs.emptyDir(this.getDefaultInstallPath());
      await fs.remove(this.getSentinelPath());
    } catch (err) {
      await this._logger.debug(
        `Failed to clean up path: ${this.getDefaultInstallPath()}, error: ${err}`
      );
    }
  }

  private async installNgrok(): Promise<void> {
    await this._telemetry.sendEventWithDuration(
      DepsCheckerEvent.ngrokInstallScriptCompleted,
      async () => {
        await runWithProgressIndicator(async () => await this.doInstallNgrok(), this._logger);
      }
    );
  }

  private static extractNpmInstallLog(exitCode: number, log: string) {
    const nodePattern = /npm\s+info\s+using\s+node@(.*)/;
    const nodeResult = log.match(nodePattern);
    const nodeVersion = nodeResult ? nodeResult[1].trim() : undefined;

    const npmPattern = /npm\s+info\s+using\s+npm@(.*)/;
    const npmResult = log.match(npmPattern);
    const npmVersion = npmResult ? npmResult[1].trim() : undefined;

    // Save all error log and lines that contain "ngrok"
    const errorPattern = /(npm\s+ERR+.*)|(.*ngrok.*)/gi;
    const preventEmailRedactedRegex = /[^\s]*@[^\s]*/;
    const errorResults = log.match(errorPattern);
    const errorMessage = errorResults?.map((value) => {
      // redact strings that contain "@" to prevent telemetry reporter from redacting the whole property
      return value.trim().replace(preventEmailRedactedRegex, "<redacted: email>");
    });

    const properties: { [key: string]: string } = {};
    properties[TelemetryProperties.NgrokNpmInstallExitCode] = `${exitCode}`;
    properties[TelemetryProperties.NgrokNpmInstallNodeVersion] = `${nodeVersion}`;
    properties[TelemetryProperties.NgrokNpmInstallNpmVersion] = `${npmVersion}`;
    properties[TelemetryProperties.NgrokNpmInstallLog] = `${errorMessage?.join("\n")}`;
    return properties;
  }

  private async doInstallNgrok(): Promise<void> {
    await this._logger.info(Messages.startInstallNgrok().replace("@NameVersion", displayNgrokName));

    try {
      const npmCommand = this.getExecCommand("npm");
      const result = await cpUtils.tryExecuteCommand(
        undefined,
        this._logger,
        { timeout: timeout, shell: false },
        npmCommand,
        "install",
        // not use -f, to avoid npm@6 bug: exit code = 0, even if install fail
        `${ngrokName}@${installPackageVersion}`,
        "--prefix",
        `${this.getDefaultInstallPath()}`,
        "--no-audit",
        "--loglevel", // this will make npm output log to stderr
        "verbose"
      );

      const log = result.cmdOutputIncludingStderr;
      const properties = NgrokChecker.extractNpmInstallLog(result.code, log);
      this._telemetry.sendEvent(DepsCheckerEvent.ngrokNpmLog, properties);
      if (result.code !== 0) {
        const errorMessage = `Failed to run command: "${npmCommand} ${result.formattedArgs}", code: "${result.code}",
                              output: "${result.cmdOutput}", error: "${result.cmdOutputIncludingStderr}"`;
        throw new Error(errorMessage);
      }

      await fs.ensureFile(this.getSentinelPath());
    } catch (error) {
      this._telemetry.sendSystemErrorEvent(
        DepsCheckerEvent.ngrokInstallScriptError,
        TelemtryMessages.failedToInstallNgrok,
        error
      );
    }
  }

  private getExecCommand(command: string): string {
    return isWindows() ? `${command}.cmd` : command;
  }
}
