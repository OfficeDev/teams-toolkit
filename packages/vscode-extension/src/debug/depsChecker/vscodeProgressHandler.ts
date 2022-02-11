// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler } from "@microsoft/teamsfx-api";
import { ProgressHandler } from "../../progressHandler";

export class VsCodeProgressHandler extends ProgressHandler implements IProgressHandler {
  private stepNum: number;
  constructor(title: string, totalSteps: number) {
    super(title, totalSteps);
    this.stepNum = 0;
  }

  public async next(detail?: string) {
    ++this.stepNum;
    super.next(detail);
  }

  public getStepNum(): number {
    return this.stepNum;
  }
}

export class ProgressBarGroup {
  private subProgressBars: VsCodeProgressHandler[] = [];
  constructor(private title: string, private totalSteps: number) {}

  private getCurrentStep(): number {
    let res = 0;
    for (const bar of this.subProgressBars) {
      res += bar.getStepNum();
    }
    return res;
  }

  public async startProgressHandler(): Promise<VsCodeProgressHandler> {
    const newProgressBar = new VsCodeProgressHandler(this.title, this.totalSteps);
    this.subProgressBars.push(newProgressBar);
    await newProgressBar.start(undefined, this.getCurrentStep());
    return newProgressBar;
  }

  public async endAll() {
    for (const bar of this.subProgressBars) {
      await bar.end(true);
    }
  }
}
