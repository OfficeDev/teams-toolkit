// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SingleBar } from "cli-progress";

import { LogLevel } from "@microsoft/teamsfx-api";

import LogProvider from "../commonlib/log";
import Controller from "./controller";

export default class Instance {
  private readonly controller: Controller;
  private totalSteps: number;
  private currentStep = 0;
  private readonly title: string;
  private currentPercentage = 0;
  private detail?: string;
  private bar?: SingleBar;

  constructor(title: string, totalSteps: number) {
    this.totalSteps = totalSteps;
    this.title = title;
    this.controller = Controller.getInstance();
    this.controller.register(this);
  }

  get message() {
    return `[${this.currentStep}/${this.totalSteps}] ${this.title}: ${this.detail || "starting."}`;
  }

  get percentage(): number {
    const needArrivedPercentage = (this.currentStep / this.totalSteps) * 100;
    const nextArrivedPercentage = ((this.currentStep + 1) / this.totalSteps) * 100;
    if (this.currentPercentage < needArrivedPercentage) {
      const diff = needArrivedPercentage - this.currentPercentage;
      this.currentPercentage += diff / this.controller.fps >= 5 ? diff / this.controller.fps : 5;
    } else if (this.currentPercentage < nextArrivedPercentage) {
      const diff = nextArrivedPercentage - this.currentPercentage;
      this.currentPercentage += diff / this.controller.fps / 10;
    }
    return this.currentPercentage;
  }

  public async start(detail?: string) {
    this.detail = detail;
    this.end();
    this.show();
    this.bar = this.controller.create(100, this.percentage, this.message);
  }

  public async end() {
    this.currentStep = 0;
    this.currentPercentage = 0;
    if (this.bar) {
      this.bar.stop();
      this.controller.remove(this.bar);
      this.bar = undefined;
    }
  }

  public async next(detail?: string) {
    this.detail = detail;
    this.currentStep++;
    this.totalSteps = Math.max(this.currentStep, this.totalSteps);
    this.show();
  }

  public update(payload: any) {
    if (this.bar) this.bar.update(this.percentage, payload);
  }

  public show() {
    this.controller.clear();
    LogProvider.necessaryLog(LogLevel.Info, this.message, true);
  }
}
