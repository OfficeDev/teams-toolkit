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
  dryRun = false;
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

  abstract createProgressBar(ui?: UserInteraction): IProgressHandler | undefined;
}
