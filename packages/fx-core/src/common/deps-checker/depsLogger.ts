// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider } from "@microsoft/teamsfx-api";

export interface DepsLogger {
  debug(message: string): Promise<boolean>;

  info(message: string): Promise<boolean>;

  warning(message: string): Promise<boolean>;

  error(message: string): Promise<boolean>;

  append(message: string): Promise<boolean>;

  appendLine(message: string): Promise<boolean>;

  printDetailLog(): Promise<void>;

  cleanup(): void;
}

// TODO: Implement DepsLoggerAdapter
export class DepsLoggerAdapter implements DepsLogger {
  private logger: LogProvider | undefined;

  public constructor(logger: LogProvider | undefined) {
    this.logger = logger;
  }
  public async debug(message: string): Promise<boolean> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
    return true;
  }
  public async info(message: string): Promise<boolean> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
    return true;
  }
  public async warning(message: string): Promise<boolean> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
    return true;
  }
  public async error(message: string): Promise<boolean> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
    return true;
  }
  public async append(message: string): Promise<boolean> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
    return true;
  }
  public async appendLine(message: string): Promise<boolean> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
    return true;
  }
  public async printDetailLog(): Promise<void> {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
  }

  cleanup(): void {
    if (this.logger) {
      throw new Error("Method not implemented.");
    }
  }
}
