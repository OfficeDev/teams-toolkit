// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler } from "@microsoft/teamsfx-api";

export class ParallelProgressHelper {
  private details: { key: string; detail: string; isFinished?: boolean }[];
  private processingKey: string | undefined;
  constructor(private progressBar: IProgressHandler) {
    this.details = [];
  }

  public async startAll(details: { key: string; detail: string }[]): Promise<void> {
    this.details = details;
    await this.nextProgressBarMessage();
  }

  public async end(key: string): Promise<void> {
    if (this.processingKey === key) {
      await this.nextProgressBarMessage();
      while (this.details.length > 0 && this.details[0].isFinished) {
        await this.nextProgressBarMessage();
      }
    } else {
      const target = this.details.find((v) => v.key === key);
      if (target) {
        target.isFinished = true;
      }
    }
  }

  private async nextProgressBarMessage() {
    const res = this.details.shift();
    if (res) {
      await this.progressBar.next(res.detail);
      this.processingKey = res.key;
    }
  }
}
