// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import chalk from "chalk";
import { MultiBar, SingleBar } from "cli-progress";

import Instance from "./instance";

export default class Controller {
  private static instance: Controller;

  public static getInstance() {
    if (!Controller.instance) {
      Controller.instance = new Controller();
    }
    return Controller.instance;
  }

  private readonly controller: MultiBar;
  private readonly terminal: any;
  private progresses: Instance[];

  private timer?: NodeJS.Timeout;
  public readonly fps = 25;

  get runningChar() {
    const chars = ["|", "/", "-", "\\"];
    return chars[Math.floor(Date.now() / 1000) % 4];
  }

  private constructor() {
    this.controller = new MultiBar({
      format: chalk.whiteBright("[{bar}] {percentage}% {runningChar} {message}"),
      stopOnComplete: true,
      clearOnComplete: true,
      hideCursor: true,
      barsize: 20,
      stream: process.stdout,
    });
    this.terminal = (this.controller as any).terminal;
    this.progresses = [];
    this.start();
  }

  public register(progress: Instance) {
    this.progresses.push(progress);
  }

  public start() {
    this.update();
  }

  public end() {
    this.progresses.forEach((progress) => {
      progress.end();
    });
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  public update() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.progresses.forEach((progress) => {
      const payload = { message: progress.message, runningChar: this.runningChar };
      progress.update(payload);
    });
    if (!this.timer) {
      this.timer = setTimeout(this.update.bind(this), 1000 / this.fps);
    }
  }

  public create(total: number, startValue: number, message: string): SingleBar {
    const payload = { message, runningChar: this.runningChar };
    return this.controller.create(total, startValue, payload);
  }

  public remove(bar: SingleBar) {
    return this.controller.remove(bar);
  }

  public clear() {
    this.terminal.cursorRelativeReset();
    this.terminal.clearBottom();
  }
}
