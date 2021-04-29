import { IDepsAdapter } from "../../../../src/debug/depsChecker/checker";
import * as process from "process";
import * as path from "path";

export class CustomDotnetInstallScript {
  private readonly _useCustomScript: boolean;
  private readonly _scriptExitCode: number;
  private readonly _scriptStdout: string;
  private readonly _scriptStderr: string;
  constructor(
    useCustomScript = false,
    scriptExitCode = 0,
    scriptStdout = "",
    scriptStderr = ""
  ) {
    this._useCustomScript = useCustomScript;
    this._scriptExitCode = scriptExitCode;
    this._scriptStdout = scriptStdout;
    this._scriptStderr = scriptStderr;

  }

  public getScriptPath(): string {
    if (this._useCustomScript) {
      process.env["ENV_CHECKER_CUSTOM_SCRIPT_STDOUT"] = this._scriptStdout;
      process.env["ENV_CHECKER_CUSTOM_SCRIPT_STDERR"] = this._scriptStderr;
      process.env["ENV_CHECKER_CUSTOM_SCRIPT_EXITCODE"] = this._scriptExitCode.toString();
      return path.resolve(__dirname, "../resource");
    } else {
      return path.resolve(__dirname, "../../../../src/debug/depsChecker/resource");
    }
  }
}

export class TestAdapter implements IDepsAdapter {
  private readonly _hasTeamsfxBackend: boolean;
  private readonly _dotnetCheckerEnabled: boolean;
  private readonly _funcToolCheckerEnabled: boolean;
  private readonly _nodeCheckerEnabled: boolean;

  private readonly _clickCancel: boolean;

  private readonly _customScript: CustomDotnetInstallScript;

  constructor(
    hasTeamsfxBackend: boolean,
    clickCancel = false,
    dotnetCheckerEnabled = true,
    funcToolCheckerEnabled = true,
    nodeCheckerEnabled = true,
    customScript = new CustomDotnetInstallScript()
  ) {
    this._hasTeamsfxBackend = hasTeamsfxBackend;
    this._clickCancel = clickCancel;
    this._dotnetCheckerEnabled = dotnetCheckerEnabled;
    this._funcToolCheckerEnabled = funcToolCheckerEnabled;
    this._nodeCheckerEnabled = nodeCheckerEnabled;
    this._customScript = customScript;
  }

  displayContinueWithLearnMore(message: string, link: string): Promise<boolean> {
    if (this._clickCancel) {
      return Promise.resolve(false);
    } else {
      return Promise.resolve(true);
    }
  }

  displayLearnMore(message: string, link: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  async displayWarningMessage(
    message: string,
    buttonText: string,
    action: () => Promise<boolean>
  ): Promise<boolean> {
    if (this._clickCancel) {
      return false;
    } else {
      return await action();
    }
  }

  showOutputChannel() {
    // empty method
  }

  hasTeamsfxBackend(): Promise<boolean> {
    return Promise.resolve(this._hasTeamsfxBackend);
  }

  dotnetCheckerEnabled(): boolean {
    return this._dotnetCheckerEnabled;
  }

  funcToolCheckerEnabled(): boolean {
    return this._funcToolCheckerEnabled;
  }

  nodeCheckerEnabled(): boolean {
    return this._nodeCheckerEnabled;
  }

  runWithProgressIndicator(callback: () => Promise<void>): Promise<void> {
    return callback();
  }

  getResourceDir(): string {
    // use the same resources under vscode-extension/src/debug/depsChecker/resource
    return this._customScript.getScriptPath();
  }
}
