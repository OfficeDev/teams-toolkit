import {
  Colors,
  ConfirmConfig,
  ConfirmResult,
  Context,
  CryptoProvider,
  FxError,
  IProgressHandler,
  InputResult,
  InputTextConfig,
  InputTextResult,
  LogLevel,
  LogProvider,
  MultiSelectConfig,
  MultiSelectResult,
  Result,
  SelectFileConfig,
  SelectFileResult,
  SelectFilesConfig,
  SelectFilesResult,
  SelectFolderConfig,
  SelectFolderResult,
  SingleFileOrInputConfig,
  SingleSelectConfig,
  SingleSelectResult,
  TelemetryReporter,
  UserInteraction,
  ok,
} from "@microsoft/teamsfx-api";

export class MockedLogProvider implements LogProvider {
  msg = "";
  verbose(msg: string): void {
    this.log(LogLevel.Verbose, msg);
  }
  debug(msg: string): void {
    this.log(LogLevel.Debug, msg);
  }
  info(msg: string | Array<any>): void {
    this.log(LogLevel.Info, msg as string);
  }
  warning(msg: string): void {
    this.log(LogLevel.Warning, msg);
  }
  error(msg: string): void {
    this.log(LogLevel.Error, msg);
  }
  log(level: LogLevel, msg: string): void {
    this.msg = msg;
  }
  async logInFile(level: LogLevel, msg: string): Promise<void> {
    this.msg = msg;
  }
  getLogFilePath(): string {
    return "";
  }
}

export class MockedTelemetryReporter implements TelemetryReporter {
  sendTelemetryEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    return;
  }
  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
  ): void {
    return;
  }
  sendTelemetryException(
    error: Error,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    return;
  }
}

export class MockedCryptoProvider implements CryptoProvider {
  encrypt(plaintext: string): Result<string, FxError> {
    return ok("");
  }
  decrypt(ciphertext: string): Result<string, FxError> {
    return ok("");
  }
}

export class MockedUserInteraction implements UserInteraction {
  async selectOption(config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> {
    return ok({ type: "success" });
  }

  async selectOptions(config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> {
    return ok({ type: "success" });
  }

  async inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    return ok({ type: "success" });
  }

  async selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    return ok({ type: "success" });
  }

  async selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    return ok({ type: "success" });
  }

  async selectFolder(config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> {
    return ok({ type: "success" });
  }

  async openUrl(link: string): Promise<Result<boolean, FxError>> {
    return ok(true);
  }

  async selectFileOrInput(
    config: SingleFileOrInputConfig
  ): Promise<Result<InputResult<string>, FxError>> {
    return ok({ type: "success" });
  }

  async showMessage(
    level: "info" | "warn" | "error",
    message: string | { content: string; color: Colors }[],
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string, FxError>> {
    return ok("");
  }

  createProgressBar(title: string, totalSteps: number): IProgressHandler {
    return {
      start: async (detail?: string) => {
        return;
      },
      end: async (success: boolean) => {
        return;
      },
      next: async (detail?: string) => {
        return;
      },
    };
  }
  async runCommand(args: {
    cmd: string;
    workingDirectory?: string;
    shell?: string;
    timeout?: number;
    env?: { [k: string]: string };
  }): Promise<Result<string, FxError>> {
    return ok("");
  }

  async confirm(config: ConfirmConfig): Promise<Result<ConfirmResult, FxError>> {
    return ok({ type: "success", value: true });
  }
}

export class MockedV2Context implements Context {
  userInteraction: UserInteraction;
  logProvider: LogProvider;
  telemetryReporter: TelemetryReporter;

  constructor() {
    this.userInteraction = new MockedUserInteraction();
    this.logProvider = new MockedLogProvider();
    this.telemetryReporter = new MockedTelemetryReporter();
  }
}
