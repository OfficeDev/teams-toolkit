import * as path from "path";
import { DepsCheckerEvent, Messages } from "./common";
import { IDepsAdapter, IDepsTelemetry } from "./checker";
import { vscodeLogger as logger } from "./cliLogger";
import { cliTelemetry } from "./cliTelemetry";
import open from "open";

export class CLIAdapter implements IDepsAdapter {
  private readonly configurationPrefix = "fx-extension";
  private readonly downloadIndicatorInterval = 1000; // same as vscode-dotnet-runtime
  private readonly validateDotnetSdkKey = "validateDotnetSdk";
  private readonly validateFuncCoreToolsKey = "validateFuncCoreTools";
  private readonly validateNodeVersionKey = "validateNode";
  private readonly _telemetry: IDepsTelemetry;

  constructor(telemetry: IDepsTelemetry) {
    this._telemetry = telemetry;
  }

  public hasTeamsfxBackend(): Promise<boolean> {
    // TODO: check teamsfx backend
    return Promise.resolve(true);
  }

  public dotnetCheckerEnabled(): boolean {
    return this.checkerEnabled(this.validateDotnetSdkKey);
  }

  public funcToolCheckerEnabled(): boolean {
    return this.checkerEnabled(this.validateFuncCoreToolsKey);
  }

  public nodeCheckerEnabled(): boolean {
    return this.checkerEnabled(this.validateNodeVersionKey);
  }

  public async runWithProgressIndicator(callback: () => Promise<void>): Promise<void> {
    // TODO: show progress info
    await callback();
  }

  public async displayContinueWithLearnMore(message: string, link: string): Promise<boolean> {
    // TODO: implement me
    return true;
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
    // TODO: implement me
    return true;
  }

  public showOutputChannel(): void {
    // not need in CLI
  }

  public getResourceDir(): string {
    return path.resolve(__dirname, "resource");
  }

  private checkerEnabled(key: string): boolean {
    return true;
  }

  private static async openUrl(url: string): Promise<void> {
    await open(url);
  }
}

export const cliAdapter = new CLIAdapter(cliTelemetry);
