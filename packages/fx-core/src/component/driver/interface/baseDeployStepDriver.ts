// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DriverContext } from "./commonArgs";
import { DeployContext } from "./buildAndDeployArgs";
import { IProgressHandler, UserInteraction } from "@microsoft/teamsfx-api";

export abstract class BaseDeployStepDriver {
  args: unknown;
  context: DeployContext;
  workingDirectory: string;
  distDirectory: string;
  protected progressBar?: IProgressHandler;

  constructor(args: unknown, context: DriverContext) {
    this.args = args;
    this.progressBar = this.createProgressBar(context.ui);
    this.workingDirectory = context.projectPath;
    this.distDirectory = "";
    this.context = {
      azureAccountProvider: context.azureAccountProvider,
      progressBar: this.progressBar,
      logProvider: context.logProvider,
      telemetryReporter: context.telemetryReporter,
    };
  }

  /**
   * call when error happens
   * do some resource clean up
   */
  async cleanup(): Promise<void> {
    await this.progressBar?.end(false);
  }

  abstract createProgressBar(ui?: UserInteraction): IProgressHandler | undefined;
}
