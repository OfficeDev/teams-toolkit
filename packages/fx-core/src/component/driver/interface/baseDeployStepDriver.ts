// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DriverContext } from "./commonArgs";
import { DeployContext } from "./buildAndDeployArgs";
import { IProgressHandler } from "@microsoft/teamsfx-api";

export abstract class BaseDeployStepDriver {
  args: unknown;
  context: DeployContext;
  progressBarName = "Deploying";
  progressBarSteps = 1;
  workingDirectory?: string;
  protected progressBar?: IProgressHandler;

  constructor(args: unknown, context: DriverContext) {
    this.args = args;
    this.progressBar = context.ui?.createProgressBar(this.progressBarName, this.progressBarSteps);
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
}
