// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { displayLearnMore, displayWarningMessage, logger, stopProcess } from "./checkerAdapter";
import { isLinux } from "./common";

export interface IDepsChecker {
  isEnabled(): Promise<boolean>;
  isInstalled(): Promise<boolean>;
  install(): Promise<void>;
  getDepsInfo(): Promise<DepsInfo>;
}

export interface DepsInfo {
  nameWithVersion: string;
  details: Map<string, string>;
}

const defaultErrorMessage = "Please install the required dependencies manually.";
const defaultHelpLink = "https://review.docs.microsoft.com/en-us/mods/?branch=main";

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
      logger.outputChannel.show(false);
      for (const checker of validCheckers) {
        try {
          await checker.install();
        } catch (error) {
          if (error instanceof DepsCheckerError) {
            await displayLearnMore(error.message, (error as DepsCheckerError).helpLink);
          } else {
            await displayLearnMore(defaultErrorMessage, defaultHelpLink);
          }

          await stopProcess();
          return !shouldContinue;
        }
      }

      return shouldContinue;
    });
  }

  private async check(): Promise<Array<IDepsChecker>> {
    const validCheckers = new Array<IDepsChecker>();
    for (const checker of this._checkers) {
      if (checker.isEnabled() && !(await checker.isInstalled())) {
        validCheckers.push(checker);
      }
    }

    return validCheckers;
  }

  private async generateMessage(checkers: Array<IDepsChecker>): Promise<string> {
    const depsInfo = [];
    for (const checker of checkers) {
      const info = await checker.getDepsInfo();
      depsInfo.push(info.nameWithVersion);
    }

    const message = depsInfo.join(" and ");
    return `The toolkit cannot find ${message} on your machine.

As a fundamental runtime context for Teams app, these dependencies are required. Following steps will help you to install the appropriate version to run the Microsoft Teams Toolkit.

Click “Install” to continue.`;
  }
}
