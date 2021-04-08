import { IDepsChecker, DepsInfo } from "./checker";
import { logger } from "./checkerAdapter";

export class FuncToolChecker implements IDepsChecker {

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
