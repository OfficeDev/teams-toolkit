// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import figures from "figures";

import { Colors, IProgressHandler } from "@microsoft/teamsfx-api";

import { getColorizedString } from "../utils";
import ScreenManager, { Row } from "./screen";

export default class Progress implements IProgressHandler {
  private static instances: Progress[] = [];
  private static rows: Row[] = [];
  private static finishedRows: Row[] = [];

  static readonly barSize = 20;

  private static add(instance: Progress) {
    this.instances.push(instance);
    this.rows.push(ScreenManager.addProgress(instance.wholeMessage.bind(instance)));
  }

  private static finish(instance: Progress) {
    const idx = this.findIndex(instance);
    if (idx > -1) {
      this.rows[idx].update();
      this.rows[idx].removeCB();
      this.finishedRows.push(this.rows[idx]);
      this.instances.splice(idx, 1);
      this.rows.splice(idx, 1);
    }

    if (this.instances.length === 0 && this.finishedRows.length > 0) {
      for (const row of this.finishedRows) {
        row.freeze();
      }
      this.finishedRows = [];
    }
  }

  static end(success: boolean) {
    const instances = [...this.instances];
    instances.forEach((i) => i.end(success));
  }

  private static findIndex(instance: Progress) {
    return this.instances.findIndex((i) => i === instance);
  }

  private readonly title: string;
  private totalSteps: number;
  private currentStep: number;
  private currentPercentage: number;
  private detail?: string;
  private status?: "done" | "error" | "running";

  constructor(title: string, totalSteps: number) {
    this.totalSteps = totalSteps;
    this.title = title;
    this.currentStep = 0;
    this.currentPercentage = 0;
  }

  async start(detail?: string) {
    this.status = "running";
    this.detail = detail;
    this.currentStep = 0;
    if (Progress.findIndex(this) < 0) {
      Progress.add(this);
    }
  }

  async end(success: boolean) {
    this.status = success ? "done" : "error";
    if (success) this.currentPercentage = 100;
    if (Progress.findIndex(this) > -1) {
      Progress.finish(this);
    }
  }

  async next(detail?: string) {
    this.detail = detail;
    this.currentStep++;
    if (this.totalSteps < this.currentStep) this.totalSteps = this.currentStep;
  }

  private updatePercentage() {
    const needArrivedPercentage = ((this.currentStep - 1) / this.totalSteps) * 100;
    const nextArrivedPercentage = (this.currentStep / this.totalSteps) * 100 - 1;
    if (this.currentPercentage < needArrivedPercentage) {
      const diff = needArrivedPercentage - this.currentPercentage;
      this.currentPercentage += diff / ScreenManager.fps >= 5 ? diff / ScreenManager.fps : 5;
    } else if (this.currentPercentage < nextArrivedPercentage) {
      const diff = nextArrivedPercentage - this.currentPercentage;
      this.currentPercentage += diff / ScreenManager.fps / 20;
    }
    this.currentPercentage = Math.min(this.currentPercentage, 100);
  }

  wholeMessage(): string {
    this.updatePercentage();
    const message =
      this.status === "done"
        ? this.doneMessage
        : this.status === "error"
        ? this.errorMessage
        : this.message;
    return getColorizedString([
      {
        content: `${this.barStatus}  ${Math.round(this.currentPercentage)}% ${
          this.runningChar
        } ${message}`,
        color: Colors.BRIGHT_WHITE,
      },
    ]);
  }

  get barStatus(): string {
    const completeSize = Math.round((this.currentPercentage / 100) * Progress.barSize);
    return "█".repeat(completeSize) + "▒".repeat(Progress.barSize - completeSize);
  }

  get runningChar() {
    const chars = ["|", "/", "-", "\\"];
    return chars[this.status === "running" ? Math.floor(Date.now() / 1000) % 4 : 0];
  }

  get doneMessage(): string {
    return getColorizedString([
      {
        content: `[${this.totalSteps}/${this.totalSteps}] ${this.title} `,
        color: Colors.BRIGHT_WHITE,
      },
      { content: `(${figures.tick}) Done.`, color: Colors.BRIGHT_GREEN },
    ]);
  }

  get errorMessage(): string {
    return getColorizedString([
      {
        content: `[${this.currentStep}/${this.totalSteps}] ${this.title}: ${
          this.detail || "starting."
        }`,
        color: Colors.BRIGHT_WHITE,
      },
      { content: ` (${figures.cross}) Failed.`, color: Colors.BRIGHT_RED },
    ]);
  }

  get message(): string {
    return getColorizedString([
      {
        content: `[${this.currentStep}/${this.totalSteps}] ${this.title}: ${
          this.detail || "starting."
        }`,
        color: Colors.BRIGHT_WHITE,
      },
    ]);
  }
}
