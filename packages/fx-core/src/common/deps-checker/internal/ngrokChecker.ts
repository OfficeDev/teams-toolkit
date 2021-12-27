// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { ConfigFolderName, Result, ok, err } from "@microsoft/teamsfx-api";

import { defaultHelpLink, ngrokInstallHelpLink } from "../constant/helpLink";
import { DepsCheckerError, LinuxNotSupportedError } from "../depsError";
import { runWithProgressIndicator } from "../util/progressIndicator";
import { cpUtils } from "../util/cpUtils";
import { isLinux, isWindows } from "../util/system";
import { DepsCheckerEvent, TelemtryMessages } from "../constant/telemetry";
import { DepsLogger } from "../depsLogger";
import { DepsTelemetry } from "../depsTelemetry";
import { DepsInfo, DepsChecker } from "../depsChecker";
import { Messages } from "../constant/message";

const ngrokName = "ngrok";

const installPackageVersion = "4.2.2";
const supportedPackageVersions = [">=3.4.0"];
const supportedBinVersions = ["2.3"];
const displayNgrokName = `${ngrokName}@${installPackageVersion}`;

const timeout = 5 * 60 * 1000;
const binFolderKey = "binFolder";

export class NgrokChecker implements DepsChecker {
  private readonly _logger: DepsLogger;
  private readonly _telemetry: DepsTelemetry;

  constructor(logger: DepsLogger, telemetry: DepsTelemetry) {
    this._logger = logger;
    this._telemetry = telemetry;
  }

  public async command(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  public getDepsInfo(): Promise<DepsInfo> {
    const details = new Map<string, string>();
    details.set(binFolderKey, this.getNgrokBinFolder());
    return Promise.resolve({
      name: ngrokName,
      isLinuxSupported: true,
      installVersion: installPackageVersion,
      supportedVersions: supportedPackageVersions,
      details: details,
    });
  }

  public async isInstalled(): Promise<boolean> {
    let isVersionSupported = false,
      hasSentinel = false;
    try {
      const ngrokVersion = await this.queryNgrokBinVersion();
      isVersionSupported =
        ngrokVersion !== undefined && supportedBinVersions.includes(ngrokVersion);
      hasSentinel = await fs.pathExists(this.getSentinelPath());
    } catch (error) {
      // do nothing
      return false;
    }
    return isVersionSupported && hasSentinel;
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
    await this._logger.info(Messages.finishInstallNgrok.replace("@NameVersion", displayNgrokName));
  }

  public getNgrokBinFolder(): string {
    return path.join(this.getDefaultInstallPath(), "node_modules", "ngrok", "bin");
  }

  public async resolve(): Promise<Result<boolean, DepsCheckerError>> {
    try {
      if (!(await this.isInstalled())) {
        // TODO: show output in extension
        // this._adapter.showOutputChannel();
        await this.install();
        this._logger.cleanup();
      }
    } catch (error) {
      await this._logger.printDetailLog();
      this._logger.cleanup();
      await this._logger.error(`Failed to install 'ngrok', error = '${error}'`);
      if (error instanceof DepsCheckerError) {
        return err(error);
      }
      return err(new DepsCheckerError(error.message, ngrokInstallHelpLink));
    }

    return ok(true);
  }

  private async handleInstallNgrokFailed(): Promise<void> {
    await this.cleanup();

    this._telemetry.sendSystemErrorEvent(
      DepsCheckerEvent.ngrokInstallError,
      TelemtryMessages.failedToInstallNgrok,
      Messages.failToValidateNgrok.replace("@NameVersion", displayNgrokName)
    );
    throw new DepsCheckerError(
      Messages.failToInstallNgrok.split("@NameVersion").join(displayNgrokName),
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
      Messages.needInstallNgrok.replace("@NameVersion", displayNgrokName),
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

  private async doInstallNgrok(): Promise<void> {
    await this._logger.info(Messages.startInstallNgrok.replace("@NameVersion", displayNgrokName));

    try {
      await cpUtils.executeCommand(
        undefined,
        this._logger,
        { timeout: timeout, shell: false },
        this.getExecCommand("npm"),
        "install",
        // not use -f, to avoid npm@6 bug: exit code = 0, even if install fail
        `${ngrokName}@${installPackageVersion}`,
        "--prefix",
        `${this.getDefaultInstallPath()}`
      );

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
