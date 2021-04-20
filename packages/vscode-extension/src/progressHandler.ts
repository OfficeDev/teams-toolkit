/* eslint-disable @typescript-eslint/no-this-alias */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { IProgressStatus, ok, UserError } from "fx-api";
import { CancellationToken, Disposable, ProgressLocation } from "vscode";
import { ext } from "./extensionVariables";
import { sleep } from "./utils/commonUtils";

export class ProgressHandler {
  private totalSteps: number;
  private currentStep: number;
  private title: string;
  private detail?: string;
  private ended: boolean;

  private resolve?: any;
  private reject?: any;

  constructor(title: string, totalSteps: number) {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.title = title;
    this.ended = false;
  }

  private generateWholeMessage(): string {
    const head = `[Teams Toolkit] ${this.title}`;
    const body = `: [${this.currentStep}/${this.totalSteps}]`;
    const tail = this.detail ? ` ${this.detail}` : " Prepare task.";
    return `${head}${body}${tail} (Notice:You can reload the window and retry if task spends too long time.)`;
  }

  public async start(detail?: string) {
    this.resolve = undefined;
    this.reject = undefined;
    this.currentStep = 0;
    this.ended = false;

    this.detail = detail;
    const _this = this;
    const promise = new Promise((resolve, reject) => {
      _this.resolve = resolve;
      _this.reject = reject;
    });

    ext.ui.withProgress(
      {
        location: ProgressLocation.Notification,
        cancellable: true
      },
      async (progress,token) => {
        const listener: Disposable = token.onCancellationRequested(() => {
          this.reject(new UserError("UserCancel", "UserCancel", "Extension"));
          listener.dispose();
        });
        await sleep(10);
        let resolve = _this.resolve;
        do {
          const status: IProgressStatus = { message: this.generateWholeMessage() };
          progress.report(status);
          await sleep(10);
          resolve = await new Promise((_resolve) => resolve?.(_resolve));
        } while (!this.ended);
        return ok(null);
      }
    );

    this.resolve = await promise;
  }

  public async end() {
    this.ended = true;
    this.resolve?.(undefined);
    await sleep(10);
  }

  public async next(detail?: string) {
    this.detail = detail;
    this.currentStep++;
    this.totalSteps = Math.max(this.currentStep, this.totalSteps);
    this.resolve = await new Promise((resolve) => this.resolve?.(resolve));
  }
}
