import * as os from "os";
import * as path from "path";
import { DepsCheckerEvent, Messages } from "./common";
import { IDepsAdapter, IDepsTelemetry } from "./checker";
import { cliEnvCheckerLogger as logger } from "./cliLogger";
import { cliTelemetry } from "./cliTelemetry";
import DialogManagerInstance from "../../../userInterface";
import CLIUIInstance from "../../../userInteraction";
import cliLogger from "../../../commonlib/log";

export class CLIAdapter implements IDepsAdapter {
  private readonly configurationPrefix = "fx-extension";
  private readonly downloadIndicatorInterval = 1000; // same as vscode-dotnet-runtime
  private readonly validateDotnetSdkKey = "validateDotnetSdk";
  private readonly validateFuncCoreToolsKey = "validateFuncCoreTools";
  private readonly validateNodeVersionKey = "validateNode";
  private readonly _telemetry: IDepsTelemetry;
  private readonly _hasBackend: boolean;

  constructor(hasBackend: boolean, telemetry: IDepsTelemetry) {
    this._hasBackend = hasBackend;
    this._telemetry = telemetry;
  }

  public hasTeamsfxBackend(): Promise<boolean> {
    return Promise.resolve(this._hasBackend);
  }

  public dotnetCheckerEnabled(): Promise<boolean> {
    // TODO: implement me
    throw new Error("not implemented");
  }

  public funcToolCheckerEnabled(): Promise<boolean> {
    // TODO: implement me
    throw new Error("not implemented");
  }

  public nodeCheckerEnabled(): Promise<boolean> {
    // TODO: implement me
    throw new Error("not implemented");
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

  public async displayContinueWithLearnMore(message: string, link: string): Promise<boolean> {
    const res = await CLIUIInstance.showMessage(
      "info",
      message,
      true,
      Messages.learnMoreButtonText,
      Messages.continueButtonText
    );
    const userSelected: string | undefined = res?.isOk() ? res.value : undefined;

    if (userSelected === Messages.learnMoreButtonText) {
      this._telemetry.sendEvent(DepsCheckerEvent.clickLearnMore);
      CLIAdapter.openUrl(link);
      return false;
    } else if (userSelected === Messages.continueButtonText) {
      this._telemetry.sendEvent(DepsCheckerEvent.clickContinue);
      return true;
    } else {
      this._telemetry.sendEvent(DepsCheckerEvent.clickCancel);
      return false;
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

  private static async openUrl(url: string): Promise<void> {
    CLIUIInstance.openUrl(url);
  }
}
