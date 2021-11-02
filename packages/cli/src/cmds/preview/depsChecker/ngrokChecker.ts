// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import { cpUtils } from "./cpUtils";
import {
  DepsChecker,
  DepsInfo,
  IDepsAdapter,
  IDepsChecker,
  IDepsLogger,
  IDepsTelemetry,
} from "./checker";
import { defaultHelpLink, DepsCheckerEvent, isWindows, Messages, TelemtryMessages } from "./common";
import { DepsCheckerError } from "./errors";
import * as os from "os";
import { ConfigFolderName } from "@microsoft/teamsfx-api";

const ngrokName = "ngrok";

const installPackageVersion = "4.2.2";
const supportedPackageVersions = [">=3.4.0"];
const supportedBinVersions = ["2.3"];
const displayNgrokName = `${ngrokName}@${installPackageVersion}`;

const timeout = 5 * 60 * 1000;

export class NgrokChecker implements IDepsChecker {
  private readonly _adapter: IDepsAdapter;
  private readonly _logger: IDepsLogger;
  private readonly _telemetry: IDepsTelemetry;

  constructor(adapter: IDepsAdapter, logger: IDepsLogger, telemetry: IDepsTelemetry) {
    this._adapter = adapter;
    this._logger = logger;
    this._telemetry = telemetry;
  }

  public getDepsInfo(): Promise<DepsInfo> {
    return Promise.resolve({
      name: ngrokName,
      installVersion: installPackageVersion,
      supportedVersions: supportedPackageVersions,
      details: new Map<string, string>(),
    });
  }

  public async isEnabled(): Promise<boolean> {
    // only for bot
    const hasBot = await this._adapter.hasTeamsfxBot();
    const checkerEnabled = await this._adapter.ngrokCheckerEnabled();
    return hasBot && checkerEnabled;
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

  // TODO: integrate into checker.ts after checker supports linux
  public async resolve(): Promise<boolean> {
    try {
      if ((await this.isEnabled()) && !(await this.isInstalled())) {
        this._adapter.showOutputChannel();
        await this.install();
        this._logger.cleanup();
      }
    } catch (error) {
      await this._logger.printDetailLog();
      this._logger.cleanup();
      await this._logger.error(`Failed to install 'ngrok', error = '${error}'`);
      const continueNext = await DepsChecker.handleErrorWithDisplay(error, this._adapter);
      return continueNext;
    }

    return true;
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
      defaultHelpLink
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
      defaultHelpLink
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
        await this._adapter.runWithProgressIndicator(async () => await this.doInstallNgrok());
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
