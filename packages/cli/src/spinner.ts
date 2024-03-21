// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TextType, colorize } from "./colorize";

const defaultSpinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const defaultTextType = TextType.Spinner;
const defaultRefreshInterval = 100;

interface CustomizedSpinnerOptions {
  spinnerFrames?: string[];
  textType?: TextType;
  refreshInterval?: number;
}

export class CustomizedSpinner {
  public spinnerFrames: string[] = defaultSpinnerFrames;
  public textType: TextType = defaultTextType;
  public refreshInterval: number = defaultRefreshInterval; // refresh internal in milliseconds
  private intervalId: NodeJS.Timeout | null = null;

  constructor(options: CustomizedSpinnerOptions = {}) {
    if (options.spinnerFrames) {
      this.spinnerFrames = options.spinnerFrames;
    }
    if (options.textType) {
      this.textType = options.textType;
    }
    if (options.refreshInterval) {
      this.refreshInterval = options.refreshInterval;
    }
  }

  public start(): void {
    // hide cursor
    process.stdout.write("\x1b[?25l");
    let currentFrameIndex = 0;
    this.intervalId = setInterval(() => {
      const frame = this.spinnerFrames[currentFrameIndex % this.spinnerFrames.length];
      const message = colorize(frame, this.textType);
      process.stdout.write(`\r${message}`);
      currentFrameIndex++;
    }, this.refreshInterval);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      // show cursor
      process.stdout.write("\x1b[?25h\n");
    }
  }
}
