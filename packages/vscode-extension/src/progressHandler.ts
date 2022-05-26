/* eslint-disable @typescript-eslint/no-this-alias */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { IProgressHandler, ok } from "@microsoft/teamsfx-api";
import { ProgressLocation, window } from "vscode";
import { sleep } from "./utils/commonUtils";
import * as util from "util";
import { localize } from "./utils/localizeUtils";

export class ProgressHandler implements IProgressHandler {
  private totalSteps: number;
  private currentStep: number;
  private title: string;
  private detail?: string;
  private ended: boolean;

  private resolve?: any;

  constructor(title: string, totalSteps: number) {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.title = title;
    this.ended = false;
  }

  private generateWholeMessage(): string {
    const head = this.title;
    const body = `: [${this.currentStep}/${this.totalSteps}] ${util.format(
      localize("teamstoolkit.progressHandler.showOutputLink"),
      "command:fx-extension.showOutputChannel"
    )}`;
    const tail = this.detail
      ? ` ${this.detail}`
      : localize("teamstoolkit.progressHandler.prepareTask");
    return util.format(localize("teamstoolkit.progressHandler.reloadNotice"), head, body, tail);
  }

  public async start(detail?: string) {
    this.resolve = undefined;
    this.currentStep = 0;
    this.ended = false;

    this.detail = detail;
    const _this = this;
    const promise = new Promise((resolve) => {
      _this.resolve = resolve;
    });

    window.withProgress(
      {
        location: ProgressLocation.Notification,
        cancellable: false,
      },
      async (progress) => {
        await sleep(10);
        let resolve = _this.resolve;
        do {
          const status = { message: this.generateWholeMessage() };
          progress.report(status);
          await sleep(10);
          resolve = await new Promise((_resolve) => resolve?.(_resolve));
        } while (!this.ended);
        return ok(null);
      }
    );

    this.resolve = await promise;
  }

  public async end(success: boolean) {
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
