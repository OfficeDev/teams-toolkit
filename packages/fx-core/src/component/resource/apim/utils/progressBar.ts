// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { IProgressHandler, UserInteraction } from "@microsoft/teamsfx-api";
import { ProgressMessages, ProgressStep } from "../constants";

export class ProgressBar {
  private progressBarMap = new Map<ProgressStep, IProgressHandler>();

  public async init(step: ProgressStep, ui?: UserInteraction): Promise<void> {
    if (step === ProgressStep.None) {
      return;
    }

    await this.progressBarMap.get(step)?.end(true);

    const progressBar = ui?.createProgressBar(step, Object.keys(ProgressMessages[step]).length);

    if (progressBar) {
      this.progressBarMap.set(step, progressBar);
    }
    await progressBar?.start();
  }

  public async next(step: ProgressStep, detail: string): Promise<void> {
    if (step === ProgressStep.None) {
      return;
    }

    await this.progressBarMap.get(step)?.next(detail);
  }

  public async close(step: ProgressStep, success: boolean): Promise<void> {
    if (step === ProgressStep.None) {
      return;
    }

    await this.progressBarMap.get(step)?.end(success);
  }

  public async closeAll(success: boolean): Promise<void> {
    for (const [type, bar] of this.progressBarMap) {
      await bar.end(success);
    }
  }
}
