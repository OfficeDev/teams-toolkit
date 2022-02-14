// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler } from "@microsoft/teamsfx-api";

export class ProgressHelper {
  private details: { key: string; detail: string; isFinished?: boolean }[];
  constructor(private progressBar: IProgressHandler) {
    this.details = [];
  }

  public async start(details: { key: string; detail: string }[]): Promise<void> {
    this.details = details;
    await this.progressBar.start();
    if (details.length > 0) {
      await this.progressBar.next(details[0].detail);
    }
  }

  public async end(key: string): Promise<void> {
    const target = this.details.find((v) => v.key === key);
    if (target) {
      target.isFinished = true;
    }

    while (this.details.length > 0 && this.details[0].isFinished) {
      this.details.shift();
      if (this.details.length > 0) {
        await this.progressBar.next(this.details[0].detail);
      }
    }
  }

  public async stop(success: boolean): Promise<void> {
    await this.progressBar.end(success);
  }
}
