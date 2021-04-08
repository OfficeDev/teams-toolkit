import { displayLearnMoreMessage, displayWarningMessage } from "./checkerAdapter";
import * as os from "os";

export interface IDepsChecker {
  isEnabled(): boolean;
  isInstalled(): Promise<boolean>;
  install(): Promise<void>;
  getDepsInfo(): DepsInfo;
}

export interface DepsInfo {
  name: string;
  version: string;
}

export class DepsCheckerError extends Error {
  constructor(message: string) {
    super(message);

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
    const confirmMessage = this.generateMessage(validCheckers);
    return await displayWarningMessage(confirmMessage, "Install", async () => {
      for (const checker of validCheckers) {
        try {
          await checker.install();
        } catch (error) {
          if (error instanceof DepsCheckerError) {
            return await displayLearnMoreMessage(error.message);
          } else {
            return await displayLearnMoreMessage();
          }
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

  private generateMessage(checkers: Array<IDepsChecker>): string {
    // TODO: generate message according to the checkers.
    throw new Error("Method not implemented.");
  }
}

export function isWindows() {
  return os.type() === "Windows_NT";
}

export function isMacOS() {
  return os.type() === "Darwin";
}

export function isLinux() {
  return os.type() === "Linux";
}
