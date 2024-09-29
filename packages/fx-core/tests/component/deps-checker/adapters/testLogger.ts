import { LogLevel } from "@microsoft/teamsfx-api";
import { DepsLogger } from "../../../../src/component/deps-checker/depsLogger";

export class TestLogger implements DepsLogger {
  public append(message: string): Promise<boolean> {
    this.writeLog(LogLevel.Debug, message);
    return Promise.resolve(true);
  }
  public appendLine(message: string): Promise<boolean> {
    this.writeLog(LogLevel.Debug, message);
    return Promise.resolve(true);
  }
  public debug(message: string): Promise<boolean> {
    this.writeLog(LogLevel.Debug, message);
    return Promise.resolve(true);
  }

  public info(message: string): Promise<boolean> {
    this.writeLog(LogLevel.Info, message);
    return Promise.resolve(true);
  }

  public warning(message: string): Promise<boolean> {
    this.writeLog(LogLevel.Warning, message);
    return Promise.resolve(true);
  }

  public error(message: string): Promise<boolean> {
    this.writeLog(LogLevel.Error, message);
    return Promise.resolve(true);
  }

  public async printDetailLog(): Promise<void> {}
  public cleanup(): void {}

  private writeLog(level: LogLevel, message: string) {
    const line = `${LogLevel[level]} ${new Date().toISOString()}: ${message}`;
    console.error(line);
  }
}

export const logger = new TestLogger();
