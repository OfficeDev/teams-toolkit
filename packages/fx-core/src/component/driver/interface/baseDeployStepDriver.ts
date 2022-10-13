// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DriverContext } from "./commonArgs";
import { DeployContext } from "./buildAndDeployArgs";

export abstract class BaseDeployStepDriver {
  args: unknown;
  context: DeployContext;
  progressBarName = "Deploying";
  progressBarSteps = 1;

  constructor(args: unknown, context: DriverContext) {
    this.args = args;
    this.context = {
      azureAccountProvider: context.azureAccountProvider,
      progressBar: context.ui?.createProgressBar(this.progressBarName, this.progressBarSteps),
      logProvider: context.logProvider,
      telemetryReporter: context.telemetryReporter,
    };
  }
}
