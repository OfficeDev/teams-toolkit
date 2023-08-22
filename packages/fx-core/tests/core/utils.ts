// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TokenCredential } from "@azure/core-auth";
import {
  AzureAccountProvider,
  Colors,
  CryptoProvider,
  FxError,
  InputResult,
  InputTextConfig,
  InputTextResult,
  IProgressHandler,
  LoginStatus,
  LogLevel,
  LogProvider,
  M365TokenProvider,
  MultiSelectConfig,
  MultiSelectResult,
  ok,
  PermissionRequestProvider,
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
  TokenProvider,
  TokenRequest,
  Tools,
  UserInteraction,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { DEFAULT_PERMISSION_REQUEST } from "../../src/component/constants";
import { MyTokenCredential } from "../plugins/solution/util";

export function randomAppName() {
  return "mock" + new Date().getTime();
}

export class MockAzureAccountProvider implements AzureAccountProvider {
  async getIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
    return new MyTokenCredential();
  }

  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {
      unique_name: "test",
    };
  }

  listSubscriptions(): Promise<SubscriptionInfo[]> {
    throw new Error("Method not implemented.");
  }

  setSubscription(subscriptionId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getAccountInfo(): Record<string, string> {
    throw new Error("Method not implemented.");
  }

  getSelectedSubscription(): Promise<SubscriptionInfo | undefined> {
    throw new Error("Method not implemented.");
  }

  selectSubscription(subscriptionId?: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
}

export class MockM365TokenProvider implements M365TokenProvider {
  /**
   * Get M365 access token
   * @param tokenRequest permission scopes or show user interactive UX
   */
  getAccessToken(tokenRequest: TokenRequest): Promise<Result<string, FxError>> {
    throw new Error("Method not implemented.");
  }

  /**
   * Get M365 token Json object
   * - tid : tenantId
   * - unique_name : user name
   * - ...
   * @param tokenRequest permission scopes or show user interactive UX
   */
  getJsonObject(tokenRequest: TokenRequest): Promise<Result<Record<string, unknown>, FxError>> {
    throw new Error("Method not implemented.");
  }

  /**
   * Get user login status
   * @param tokenRequest permission scopes or show user interactive UX
   */
  getStatus(tokenRequest: TokenRequest): Promise<Result<LoginStatus, FxError>> {
    throw new Error("Method not implemented.");
  }
  /**
   * m365 sign out
   */
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  /**
   * Add update account info callback
   * @param name callback name
   * @param tokenRequest permission scopes
   * @param statusChange callback method
   * @param immediateCall whether callback when register, the default value is true
   */
  setStatusChangeMap(
    name: string,
    tokenRequest: TokenRequest,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<Result<boolean, FxError>> {
    throw new Error("Method not implemented.");
  }

  /**
   * Remove update account info callback
   * @param name callback name
   */
  removeStatusChangeMap(name: string): Promise<Result<boolean, FxError>> {
    throw new Error("Method not implemented.");
  }
}

export class MockTelemetryReporter implements TelemetryReporter {
  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
  ): void {
    // do nothing
  }

  sendTelemetryEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    // do nothing
  }

  sendTelemetryException(
    error: Error,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    // do nothing
  }
}

export class MockUserInteraction implements UserInteraction {
  async selectOption(config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> {
    return ok({ type: "success" });
  }

  selectOptions(config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> {
    throw new Error(`Method selectOptions not implemented: ${JSON.stringify(config)}`);
  }

  inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    throw new Error(`Method inputText not implemented: ${JSON.stringify(config)}`);
  }

  selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    throw new Error(`Method selectFile not implemented: ${JSON.stringify(config)}`);
  }

  selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    throw new Error(`Method selectFiles not implemented: ${JSON.stringify(config)}`);
  }

  selectFolder(config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> {
    throw new Error(`Method selectFolder not implemented: ${JSON.stringify(config)}`);
  }

  openUrl(link: string): Promise<Result<boolean, FxError>> {
    throw new Error(`Method openUrl not implemented: ${link}`);
  }

  selectFileOrInput(
    config: SingleFileOrInputConfig
  ): Promise<Result<InputResult<string>, FxError>> {
    throw new Error(`Method selectFileOrInput not implemented: ${config}`);
  }

  async showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  async showMessage(
    level: "info" | "warn" | "error",
    message: Array<{ content: string; color: Colors }>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  async showMessage(
    level: "info" | "warn" | "error",
    message: string | Array<{ content: string; color: Colors }>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>> {
    return ok("");
  }

  createProgressBar(title: string, totalSteps: number): IProgressHandler {
    const handler: IProgressHandler = {
      start: async (detail?: string): Promise<void> => {},
      next: async (detail?: string): Promise<void> => {},
      end: async (): Promise<void> => {},
    };
    return handler;
  }

  async runCommand(args: {
    cmd: string;
    workingDirectory?: string;
    shell?: string;
    timeout?: number;
    env?: { [k: string]: string };
  }): Promise<Result<string, FxError>> {
    throw new Error(`Method openUrl not implemented: runCommand`);
  }
}

export class MockTools implements Tools {
  logProvider = new MockLogProvider();
  tokenProvider: TokenProvider = {
    azureAccountProvider: new MockAzureAccountProvider(),
    m365TokenProvider: new MockM365TokenProvider(),
  };
  telemetryReporter = new MockTelemetryReporter();
  ui = new MockUserInteraction();
  cryptoProvider = new MockCryptoProvider();
  permissionRequestProvider = new MockPermissionRequestProvider();
}

export class MockCryptoProvider implements CryptoProvider {
  encrypt(plaintext: string): Result<string, FxError> {
    return ok(plaintext);
  }

  decrypt(ciphertext: string): Result<string, FxError> {
    return ok(ciphertext);
  }
}

export class MockPermissionRequestProvider implements PermissionRequestProvider {
  async checkPermissionRequest(): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  }

  async getPermissionRequest(): Promise<Result<string, FxError>> {
    return ok(JSON.stringify(DEFAULT_PERMISSION_REQUEST));
  }
}

export class MockLogProvider implements LogProvider {
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

export function deleteFolder(filePath?: string): void {
  if (!filePath) return;
  if (fs.existsSync(filePath)) {
    const files = fs.readdirSync(filePath);
    files.forEach((file) => {
      const nextFilePath = `${filePath}/${file}`;
      const states = fs.statSync(nextFilePath);
      if (states.isDirectory()) {
        //recurse
        deleteFolder(nextFilePath);
      } else {
        //delete file
        fs.unlinkSync(nextFilePath);
      }
    });
    try {
      fs.rmdirSync(filePath);
    } catch (e) {}
  }
}
