import { TokenCredential } from "@azure/core-auth";
import { AccessToken, GetTokenOptions } from "@azure/identity";
import {
  AzureAccountProvider,
  Colors,
  Context,
  CryptoProvider,
  FxError,
  IProgressHandler,
  InputResult,
  InputTextConfig,
  InputTextResult,
  LogLevel,
  LogProvider,
  LoginStatus,
  M365TokenProvider,
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
  SubscriptionInfo,
  TelemetryReporter,
  TokenRequest,
  UserInteraction,
  ok,
} from "@microsoft/teamsfx-api";

export class MyTokenCredential implements TokenCredential {
  public async getToken(
    scopes: string | string[],
    options?: GetTokenOptions
  ): Promise<AccessToken | null> {
    return {
      token: "a.eyJ1c2VySWQiOiJ0ZXN0QHRlc3QuY29tIn0=.c",
      expiresOnTimestamp: 1234,
    };
  }
}
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

export class MockedM365Provider implements M365TokenProvider {
  async getAccessToken(tokenRequest: TokenRequest): Promise<Result<string, FxError>> {
    return ok("fakeToken");
  }
  async getJsonObject(
    tokenRequest: TokenRequest
  ): Promise<Result<Record<string, unknown>, FxError>> {
    return ok({
      upn: "fakeUserPrincipalName@fake.com",
      tid: "tenantId",
    });
  }
  async signout(): Promise<boolean> {
    return true;
  }
  async getStatus(tokenRequest: TokenRequest): Promise<Result<LoginStatus, FxError>> {
    return ok({
      status: "SignedIn",
      token: "fakeToken",
    });
  }
  async setStatusChangeMap(
    name: string,
    tokenRequest: TokenRequest,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<Result<boolean, FxError>> {
    return ok(true);
  }
  async removeStatusChangeMap(name: string): Promise<Result<boolean, FxError>> {
    return ok(true);
  }
}

export class MockedAzureAccountProvider implements AzureAccountProvider {
  async getIdentityCredentialAsync(showDialog?: boolean): Promise<TokenCredential | undefined> {
    return new MyTokenCredential();
  }

  async signout(): Promise<boolean> {
    return true;
  }
  async setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    return true;
  }
  async removeStatusChangeMap(name: string): Promise<boolean> {
    return true;
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {};
  }
  async listSubscriptions(): Promise<SubscriptionInfo[]> {
    return [];
  }
  async setSubscription(subscriptionId: string): Promise<void> {}
  getAccountInfo(): Record<string, string> {
    return {};
  }
  async getSelectedSubscription(triggerUI?: boolean): Promise<SubscriptionInfo> {
    return {
      subscriptionId: "",
      subscriptionName: "",
      tenantId: "",
    };
  }
}
