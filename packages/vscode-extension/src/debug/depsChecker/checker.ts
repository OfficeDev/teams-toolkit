// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { displayLearnMore, displayWarningMessage, showOutputChannel } from "./checkerAdapter";
import { isLinux, Messages, defaultHelpLink } from "./common";

export interface IDepsChecker {
  isEnabled(): Promise<boolean>;
  isInstalled(): Promise<boolean>;
  install(): Promise<void>;
  getDepsInfo(): Promise<DepsInfo>;
}

export interface DepsInfo {
  name: string,
  installVersion: string;
  supportedVersions: string[];
  details: Map<string, string>;
}

export class DepsCheckerError extends Error {
  public readonly helpLink: string;

  constructor(message: string, helpLink: string) {
    super(message);

    this.helpLink = helpLink;
    Object.setPrototypeOf(this, DepsCheckerError.prototype);
  }
}

export class DepsChecker {
  private readonly _checkers: Array<IDepsChecker>;

  constructor(checkers: Array<IDepsChecker>) {
    this._checkers = checkers;
  }

  // check & install
  public async resolve(): Promise<boolean> {
    const shouldContinue = true;
    const validCheckers = await this.check();
    if (validCheckers.length === 0) {
      return shouldContinue;
    }

    if (isLinux()) {
      // TODO: provide with unsupported message
      return !shouldContinue;
    }

    // TODO: add log and telemetry
    const confirmMessage = await this.generateMessage(validCheckers);
    return await displayWarningMessage(confirmMessage, "Install", async () => {
      showOutputChannel();
      for (const checker of validCheckers) {
        try {
          await checker.install();
        } catch (error) {
          if (error instanceof DepsCheckerError) {
            await displayLearnMore(error.message, (error as DepsCheckerError).helpLink);
          } else {
            await displayLearnMore(Messages.defaultErrorMessage, defaultHelpLink);
          }

          return !shouldContinue;
        }
      }

      return shouldContinue;
    });
  }

  private async check(): Promise<Array<IDepsChecker>> {
    const validCheckers = new Array<IDepsChecker>();
    for (const checker of this._checkers) {
      if (await checker.isEnabled() && !(await checker.isInstalled())) {
        validCheckers.push(checker);
      }
    }

    return validCheckers;
  }

  private async generateMessage(checkers: Array<IDepsChecker>): Promise<string> {
    const installPackages = [];
    const supportedPackages = [];
    for (const checker of checkers) {
      const info = await checker.getDepsInfo();
      installPackages.push(`${info.name} (v${info.installVersion})`);
      const supportedVersions = info.supportedVersions.map(version => "v" + version).join(" or ");
      const supportedPackage = `${info.name} (${supportedVersions})`;
      supportedPackages.push(supportedPackage);
    }

    const installMessage = installPackages.join(" and ");
    const supportedMessage = supportedPackages.join(" and ");
    return Messages.depsNotFound.replace("@InstallPackages", installMessage).replace("@SupportedPackages", supportedMessage);
  }
}
