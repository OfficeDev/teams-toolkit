// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import * as path from "path";
import { DepsCheckerEvent, Messages } from "./common";
import { IDepsAdapter, IDepsTelemetry } from "./checker";
import CLIUIInstance from "../../../userInteraction";
import cliLogger from "../../../commonlib/log";
import { CliConfigEnvChecker, CliConfigOptions, UserSettings } from "../../../userSetttings";

export class CLIAdapter implements IDepsAdapter {
  private readonly downloadIndicatorInterval = 1000; // same as vscode-dotnet-runtime
  private readonly _telemetry: IDepsTelemetry;
  private readonly _hasBackend: boolean;
  private readonly _hasBot: boolean;
  private readonly _enableNgrok: boolean;

  constructor(
    hasBackend: boolean,
    hasBot: boolean,
    enableNgrok: boolean,
    telemetry: IDepsTelemetry
  ) {
    this._hasBackend = hasBackend;
    this._hasBot = hasBot;
    this._enableNgrok = enableNgrok;
    this._telemetry = telemetry;
  }

  public hasTeamsfxBackend(): Promise<boolean> {
    return Promise.resolve(this._hasBackend);
  }

  public hasTeamsfxBot(): Promise<boolean> {
    return Promise.resolve(this._hasBot);
  }

  public dotnetCheckerEnabled(): Promise<boolean> {
    return this.checkerEnabled(CliConfigOptions.EnvCheckerValidateDotnetSdk);
  }

  public funcToolCheckerEnabled(): Promise<boolean> {
    return this.checkerEnabled(CliConfigOptions.EnvCheckerValidateFuncCoreTools);
  }

  public ngrokCheckerEnabled(): Promise<boolean> {
    return Promise.resolve(this._enableNgrok);
  }

  public nodeCheckerEnabled(): Promise<boolean> {
    return this.checkerEnabled(CliConfigOptions.EnvCheckerValidateNode);
  }

  public async runWithProgressIndicator(callback: () => Promise<void>): Promise<void> {
    const timer = setInterval(() => cliLogger.rawLog("."), this.downloadIndicatorInterval);
    try {
      await callback();
    } finally {
      clearTimeout(timer);
      cliLogger.rawLog(os.EOL);
    }
  }

  public async displayLearnMore(message: string, link: string): Promise<boolean> {
    return await this.displayWarningMessage(message, Messages.learnMoreButtonText, async () => {
      await CLIAdapter.openUrl(link);
      return await this.displayLearnMore(message, link);
    });
  }

  public async displayWarningMessage(
    message: string,
    buttonText: string,
    action: () => Promise<boolean>
  ): Promise<boolean> {
    const res = await CLIUIInstance.showMessage(
      "info",
      message,
      true,
      Messages.learnMoreButtonText
    );
    const userSelected: string | undefined = res?.isOk() ? res.value : undefined;
    if (userSelected === Messages.learnMoreButtonText) {
      this._telemetry.sendEvent(DepsCheckerEvent.clickLearnMore);
      return await action();
    } else {
      this._telemetry.sendEvent(DepsCheckerEvent.clickCancel);
      return false;
    }
  }

  public showOutputChannel(): void {
    // not needed in CLI
  }

  public getResourceDir(): string {
    return path.resolve(__dirname, "resource");
  }

  private async checkerEnabled(key: string): Promise<boolean> {
    const result = await UserSettings.getConfigSync();
    if (result.isErr()) {
      return true;
    }

    const config = result.value;

    if (key in config) {
      return config[key] === CliConfigEnvChecker.On;
    } else {
      return true;
    }
  }

  private static async openUrl(url: string): Promise<void> {
    await CLIUIInstance.openUrl(url);
  }
}
