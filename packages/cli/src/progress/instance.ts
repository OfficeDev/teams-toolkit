// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import figures from "figures";
import { SingleBar } from "cli-progress";

import { Colors } from "@microsoft/teamsfx-api";

import Controller from "./controller";
import { getColorizedString } from "../utils";

export default class Instance {
  private readonly controller: Controller;
  private totalSteps: number;
  private currentStep = 0;
  private readonly title: string;
  private currentPercentage = 0;
  private detail?: string;
  public bar?: SingleBar;

  constructor(title: string, totalSteps: number) {
    this.totalSteps = totalSteps;
    this.title = title;
    this.controller = Controller.getInstance();
    this.controller.register(this);
  }

  get doneMessage(): string {
    return getColorizedString([
      {
        content: `[${this.totalSteps}/${this.totalSteps}] ${this.title}: `,
        color: Colors.BRIGHT_WHITE,
      },
      { content: `(${figures.tick}) Done`, color: Colors.BRIGHT_GREEN },
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
      { content: ` (${figures.cross}) Failed`, color: Colors.BRIGHT_RED },
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

  get percentage(): number {
    const needArrivedPercentage = ((this.currentStep - 1) / this.totalSteps) * 100;
    const nextArrivedPercentage = (this.currentStep / this.totalSteps) * 100;
    if (this.currentPercentage < needArrivedPercentage) {
      const diff = needArrivedPercentage - this.currentPercentage;
      this.currentPercentage += diff / this.controller.fps >= 5 ? diff / this.controller.fps : 5;
    } else if (this.currentPercentage < nextArrivedPercentage) {
      const diff = nextArrivedPercentage - this.currentPercentage;
      this.currentPercentage += diff / this.controller.fps / 10;
    }
    return Math.min(this.currentPercentage, 100);
  }

  public async start(detail?: string) {
    if (!this.bar) await this.end(true);
    this.currentStep = 0;
    this.currentPercentage = 0;
    this.detail = detail;
    this.bar = this.controller.create(100, this.percentage, this.message);
  }

  public async end(success: boolean) {
    if (success) this.currentPercentage = 100;
    if (this.bar) {
      const tmp = this.bar;
      this.bar = undefined;
      tmp.stop();
      this.controller.remove(tmp, this.percentage, success ? this.doneMessage : this.errorMessage);
    }
  }

  public async next(detail?: string) {
    this.detail = detail;
    this.currentStep++;
    this.totalSteps = Math.max(this.currentStep, this.totalSteps);
  }
}
