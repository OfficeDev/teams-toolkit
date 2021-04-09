// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as constants from "./constants";
import CLILogProvider from "./commonlib/log";

export class ProgressHandler {
  private totalSteps: number;
  private currentStep: number;
  private title: string;
  private detail?: string;

  constructor(title: string, totalSteps: number) {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.title = title;
  }

  private generateWholeMessage(): string {
    const head = `[${constants.cliSource}] ${this.title}`;
    const body = `: [${this.currentStep}/${this.totalSteps}]`;
    const tail = this.detail ? ` ${this.detail}` : " Prepare task.";
    return `${head}${body}${tail}`;
  }

  public async start(detail?: string) {
    this.currentStep = 0;
    this.detail = detail;
    CLILogProvider.info(this.generateWholeMessage());
  }

  public async end() {
    this.currentStep = 0;
  }

  public async next(detail?: string) {
    this.detail = detail;
    this.currentStep++;
    this.totalSteps = Math.max(this.currentStep, this.totalSteps);
    CLILogProvider.info(this.generateWholeMessage());
  }
}
