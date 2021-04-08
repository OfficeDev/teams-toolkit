import { IDepsChecker, DepsInfo, Logger } from "./checker";

export class FuncToolChecker implements IDepsChecker {
  private readonly _logger: Logger;
  constructor(logger: Logger) {
    this._logger = logger;
  }

  getDepsInfo(): DepsInfo {
    throw new Error("Method not implemented.");
  }
  isEnabled(): boolean {
    throw new Error("Method not implemented.");
  }
  isInstalled(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  install(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
