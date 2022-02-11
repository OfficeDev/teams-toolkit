// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler } from "@microsoft/teamsfx-api";

export class ParallelProgressHelper {
  private details: string[];
  constructor(private progressBar: IProgressHandler) {
    this.details = [];
  }

  public async start(details: string[]): Promise<void> {
    this.details = details.reverse();
  }

  public async next(): Promise<void> {
    if (this.details.length == 0) {
      return;
    }
    const detail = this.details.pop();
    await this.progressBar.next(detail);
  }
}
