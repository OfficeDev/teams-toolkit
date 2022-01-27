// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import commonlibLogger, { VsCodeLogProvider } from "../../commonlib/log";
import { OutputChannel } from "vscode";
import { DepsLogger } from "@microsoft/teamsfx-core";

export class DoctorLogger implements DepsLogger {
  public outputChannel: OutputChannel;
  private logger: VsCodeLogProvider;

  public constructor(logger: VsCodeLogProvider) {
    this.outputChannel = logger.outputChannel;
    this.logger = logger;
  }

  public async debug(message: string): Promise<boolean> {
    return Promise.resolve(true);
  }

  public async info(message: string): Promise<boolean> {
    return Promise.resolve(true);
  }

  public async warning(message: string): Promise<boolean> {
    return Promise.resolve(true);
  }

  public async error(message: string): Promise<boolean> {
    return Promise.resolve(true);
  }

  public appendLine(message: string): Promise<boolean> {
    commonlibLogger.outputChannel.appendLine(message);
    return Promise.resolve(true);
  }

  public async append(message: string): Promise<boolean> {
    commonlibLogger.outputChannel.append(message);
    return Promise.resolve(true);
  }

  public cleanup(): void {}

  public async printDetailLog(): Promise<void> {
    return Promise.resolve();
  }
}

export const doctorLogger = new DoctorLogger(commonlibLogger);
