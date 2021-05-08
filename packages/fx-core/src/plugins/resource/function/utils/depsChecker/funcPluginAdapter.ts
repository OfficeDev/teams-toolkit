/* eslint-disable @typescript-eslint/no-namespace */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import { funcPluginLogger as logger } from "./funcPluginLogger";
import { DepsCheckerError } from "./errors";
import { ConfigMap, returnUserError } from "fx-api";
import { defaultHelpLink, dotnetFailToInstallHelpLink, Messages } from "./common";
import { IDepsAdapter } from "./checker";

class FuncPluginAdapter implements IDepsAdapter {
  private readonly downloadIndicatorInterval = 1000; // same as vscode-dotnet-runtime
  private readonly answerKey = "function-dotnet-checker-enabled";
  private enabled = false;

  public displayLearnMore(message: string, link: string): Promise<boolean> {
    // TODO: implement learn more popup in plugin
    return Promise.resolve(true);
  }

  public async displayWarningMessage(
    message: string,
    buttonText: string,
    action: () => Promise<boolean>
  ): Promise<boolean> {
    return await action();
  }

  public displayContinueWithLearnMore(
    message: string,
    link: string
  ): Promise<boolean> {
    return Promise.resolve(true);
  }

  public showOutputChannel(): void {
    // TODO: find a way to implement in plugin
  }

  public getResourceDir(): string {
    return path.resolve(path.join(__dirname, "..", "..", "..", "..", "..", "..", "resource", "plugins", "resource", "function"));
  }

  public dotnetCheckerEnabled(): boolean {
    return this.enabled;
  }

  public async runWithProgressIndicator(
    callback: () => Promise<void>
  ): Promise<void> {
    // NOTE: We cannot use outputChannel in plugin to print the dots in one line.
    let counter = 1;
    const timer = setInterval(() => {
      const dots = Array(counter).fill(".").join("");
      logger.info(dots);
      counter += 1;
    }, this.downloadIndicatorInterval);
    try {
      await callback();
    } finally {
      clearTimeout(timer);
    }
  }

  public hasTeamsfxBackend(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  public funcToolCheckerEnabled(): boolean {
    throw new Error("Method not implemented.");
  }
  public nodeCheckerEnabled(): boolean {
    throw new Error("Method not implemented.");
  }

  public setFeatureFlag(answers?: ConfigMap): void {
    this.enabled = answers?.getBoolean(this.answerKey) || false;
  }

  public handleDotnetError(error: Error): void {
    if (error instanceof DepsCheckerError) {
      throw returnUserError(error, "function", "DepsCheckerError", error.helpLink, error);
    } else {
      throw returnUserError(new Error(Messages.defaultErrorMessage), "function", "DepsCheckerError", defaultHelpLink, error);
    }
  }
}

export const funcPluginAdapter = new FuncPluginAdapter();
