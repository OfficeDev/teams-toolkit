// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppStudioTokenProvider,
  assembleError,
  AzureAccountProvider,
  Colors,
  CryptoProvider,
  err,
  FxError,
  GraphTokenProvider,
  InputTextConfig,
  InputTextResult,
  IProgressHandler,
  LogLevel,
  LogProvider,
  MultiSelectConfig,
  MultiSelectResult,
  NotImplementedError,
  ok,
  PermissionRequestProvider,
  Result,
  RunnableTask,
  SelectFileConfig,
  SelectFileResult,
  SelectFilesConfig,
  SelectFilesResult,
  SelectFolderConfig,
  SelectFolderResult,
  SharepointTokenProvider,
  SingleSelectConfig,
  SingleSelectResult,
  SubscriptionInfo,
  TaskConfig,
  TelemetryReporter,
  TokenProvider,
  Tools,
  TreeProvider,
  UIConfig,
  UserInteraction,
} from "@microsoft/teamsfx-api";
import { MessageConnection } from "vscode-jsonrpc";
import { TokenCredential } from "../../api/node_modules/@azure/core-auth/types/latest/core-auth";
import {
  TokenCredentialsBase,
  DeviceTokenCredentials,
} from "../../api/node_modules/@azure/ms-rest-nodeauth/dist/lib/msRestNodeAuth";
import { Namespaces } from "./namespace";
import { Rpc, setFunc } from "./questionAdapter";
import { sendNotification, sendRequest } from "./utils";
import { MemoryCache } from "./memoryCache";
import { env } from "./constant";

export class RemoteLogProvider implements LogProvider {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    sendNotification(this.connection, `LogAsync`, logLevel, message);
    return true;
  }
  async trace(message: string): Promise<boolean> {
    return this.log(LogLevel.Trace, message);
  }
  async debug(message: string): Promise<boolean> {
    return this.log(LogLevel.Debug, message);
  }
  info(message: string): Promise<boolean>;
  info(message: { content: string; color: Colors }[]): Promise<boolean>;
  async info(message: any): Promise<boolean> {
    if (typeof message === "string") {
      return this.log(LogLevel.Info, message);
    }
    return this.log(
      LogLevel.Info,
      (message as Array<{ content: string; color: Colors }>).map((item) => item.content).join("")
    );
  }
  async warning(message: string): Promise<boolean> {
    return this.log(LogLevel.Warning, message);
  }
  async error(message: string): Promise<boolean> {
    return this.log(LogLevel.Error, message);
  }
  async fatal(message: string): Promise<boolean> {
    return this.log(LogLevel.Fatal, message);
  }
}

export class RemoteAzureAccountProvider implements AzureAccountProvider {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  async getAccountCredentialAsync(
    showDialog?: boolean,
    tenantId?: string
  ): Promise<TokenCredentialsBase | undefined> {
    const result = await sendRequest(this.connection, `AzureGetAccountCredential`);
    if (result.isErr()) {
      throw result.error;
    }
    const { accessToken, tokenJsonString } = result.value;
    const tokenJson = JSON.parse(tokenJsonString);
    const newTokenJson = (function ConvertTokenToJson(token: string) {
      const array = token!.split(".");
      const buff = Buffer.from(array[1], "base64");
      return JSON.parse(buff.toString("utf8"));
    })(accessToken);
    const tokenExpiresIn = Math.round(new Date().getTime() / 1000) - (newTokenJson.iat as number);

    const memoryCache = new (MemoryCache as any)();
    memoryCache.add(
      [
        {
          tokenType: "Bearer",
          expiresIn: tokenExpiresIn,
          expiresOn: {},
          resource: env.activeDirectoryResourceId,
          accessToken: accessToken,
          userId: (newTokenJson as any).upn ?? (newTokenJson as any).unique_name,
          _clientId: "7ea7c24c-b1f6-4a20-9d11-9ae12e9e7ac0",
          _authority: env.activeDirectoryEndpointUrl + newTokenJson.tid,
        },
      ],
      function () {
        const _ = 1;
      }
    );
    const credential = new DeviceTokenCredentials(
      "7ea7c24c-b1f6-4a20-9d11-9ae12e9e7ac0",
      tokenJson.tid,
      tokenJson.upn ?? tokenJson.unique_name,
      undefined,
      env,
      memoryCache
    );
    return Promise.resolve(credential);
  }
  async getIdentityCredentialAsync(showDialog?: boolean): Promise<TokenCredential | undefined> {
    return undefined;
  }
  signout(): Promise<boolean> {
    throw new Error(`Method not implemented:${Namespaces.AzureAccountProvider}/signout`);
  }
  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    throw new NotImplementedError(
      "FxServer",
      `${Namespaces.AzureAccountProvider}/setStatusChangeMap`
    );
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new NotImplementedError(
      "FxServer",
      `${Namespaces.AzureAccountProvider}/removeStatusChangeMap`
    );
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    const result = await sendRequest(this.connection, `AzureGetJsonObject`);
    if (result.isErr()) {
      throw result.error;
    }
    return JSON.parse(result.value);
  }
  async listSubscriptions(): Promise<SubscriptionInfo[]> {
    const result = await sendRequest(this.connection, `AzureListSubscriptions`);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
  async setSubscription(subscriptionId: string): Promise<void> {
    const result = await sendRequest(this.connection, `AzureSetSubscription`);
    if (result.isErr()) {
      throw result.error;
    }
  }
  getAccountInfo(): Record<string, string> | undefined {
    throw new NotImplementedError("FxServer", `${Namespaces.AzureAccountProvider}/getAccountInfo`);
  }
  async getSelectedSubscription(triggerUI?: boolean): Promise<SubscriptionInfo | undefined> {
    const result = await sendRequest(this.connection, `AzureGetSelectedSubscription`);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
}

export class RemoteGraphTokenProvider implements GraphTokenProvider {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  async getAccessToken(showDialog?: boolean): Promise<string | undefined> {
    const result = await sendRequest(this.connection, `GraphGetAccessToken`);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    const result = await sendRequest(this.connection, `GraphGetJsonObject`);
    if (result.isErr()) {
      throw result.error;
    }
    return JSON.parse(result.value);
  }
  signout(): Promise<boolean> {
    throw new NotImplementedError("FxServer", `${Namespaces.GraphTokenProvider}/signout`);
  }
  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    throw new NotImplementedError(
      "FxServer",
      `${Namespaces.GraphTokenProvider}/setStatusChangeMap`
    );
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new NotImplementedError(
      "FxServer",
      `${Namespaces.GraphTokenProvider}/removeStatusChangeMap`
    );
  }
}

export class RemoteAppStudioTokenProvider implements AppStudioTokenProvider {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  async getAccessToken(showDialog?: boolean): Promise<string | undefined> {
    const result = await sendRequest(this.connection, `AppStudioGetAccessToken`);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    const result = await sendRequest(this.connection, `AppStudioGetJsonObject`);
    if (result.isErr()) {
      throw result.error;
    }
    return JSON.parse(result.value);
  }
  signout(): Promise<boolean> {
    throw new NotImplementedError("FxServer", `${Namespaces.AppStudioTokenProvider}/signout`);
  }
  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    throw new NotImplementedError(
      "FxServer",
      `${Namespaces.AppStudioTokenProvider}/setStatusChangeMap`
    );
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new NotImplementedError(
      "FxServer",
      `${Namespaces.AppStudioTokenProvider}/removeStatusChangeMap`
    );
  }
}

export class RemoteSharepointTokenProvider implements SharepointTokenProvider {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  getAccessToken(showDialog?: boolean): Promise<string | undefined> {
    throw new NotImplementedError(
      "FxServer",
      `${Namespaces.SharepointTokenProvider}/getAccessToken`
    );
  }
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    throw new NotImplementedError(
      "FxServer",
      `${Namespaces.SharepointTokenProvider}/getJsonObject`
    );
  }
  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    throw new NotImplementedError(
      "FxServer",
      `${Namespaces.SharepointTokenProvider}/setStatusChangeMap`
    );
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new NotImplementedError(
      "FxServer",
      `${Namespaces.SharepointTokenProvider}/removeStatusChangeMap`
    );
  }
}

export class RemoteTokenProvider implements TokenProvider {
  connection: MessageConnection;
  azureAccountProvider: AzureAccountProvider;
  graphTokenProvider: GraphTokenProvider;
  appStudioToken: AppStudioTokenProvider;
  sharepointTokenProvider: SharepointTokenProvider;
  constructor(connection: MessageConnection) {
    this.connection = connection;
    this.azureAccountProvider = new RemoteAzureAccountProvider(connection);
    this.graphTokenProvider = new RemoteGraphTokenProvider(connection);
    this.appStudioToken = new RemoteAppStudioTokenProvider(connection);
    this.sharepointTokenProvider = new RemoteSharepointTokenProvider(connection);
  }
}

export class RemoteUserInteraction implements UserInteraction {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  async selectOption(config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> {
    console.log("selectOption");
    this.convertConfigToJson(config);
    return sendRequest(this.connection, `SelectOptionAsync`, config);
  }
  async inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    this.convertConfigToJson(config);
    return sendRequest(this.connection, `InputTextAsync`, config);
  }
  openUrl(link: string): Promise<Result<boolean, FxError>> {
    throw new NotImplementedError("FxServer", `${Namespaces.UserInteraction}/openUrl`);
  }
  runWithProgress<T>(
    task: RunnableTask<T>,
    config: TaskConfig,
    ...args: any
  ): Promise<Result<T, FxError>> {
    throw new NotImplementedError("FxServer", `${Namespaces.UserInteraction}/runWithProgress`);
  }
  selectOptions(config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> {
    this.convertConfigToJson(config);
    return sendRequest(this.connection, `SelectOptionsAsync`, config);
  }
  selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    throw new NotImplementedError("FxServer", `${Namespaces.UserInteraction}/selectFile`);
  }
  selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    throw new NotImplementedError("FxServer", `${Namespaces.UserInteraction}/selectFiles`);
  }
  selectFolder(config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> {
    this.convertConfigToJson(config);
    return sendRequest(this.connection, `SelectFolderAsync`, config);
  }
  public async showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  public async showMessage(
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
    return sendRequest(this.connection, `ShowMessage`, level, message, modal, items);
  }
  createProgressBar(title: string, totalSteps: number): IProgressHandler {
    // throw new NotImplementedError("FxServer", `${Namespaces.UserInteraction}/createProgressBar`);
    const handler: IProgressHandler = {
      start: async (detail?: string) => {},
      next: async (detail?: string) => {},
      end: async (success: boolean) => {},
    };
    return handler;
  }
  private convertConfigToJson(config: UIConfig<any>) {
    if (config.validation) {
      const funcId = setFunc(config.validation);
      (config as any).validation = { type: "ValidateFunc", id: funcId } as Rpc;
    }
  }
}

export class RemoteTelemetryReporter implements TelemetryReporter {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  sendTelemetryEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    this.connection.sendNotification(
      `${Namespaces.TelemetryReporter}/sendTelemetryEvent`,
      eventName,
      properties,
      measurements
    );
  }
  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
  ): void {
    this.connection.sendNotification(
      `${Namespaces.TelemetryReporter}/sendTelemetryErrorEvent`,
      eventName,
      properties,
      measurements,
      errorProps
    );
  }
  sendTelemetryException(
    error: Error,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    this.connection.sendNotification(
      `${Namespaces.TelemetryReporter}/sendTelemetryException`,
      error,
      properties,
      measurements
    );
  }
}
export class RemoteTools implements Tools {
  connection: MessageConnection;
  logProvider: LogProvider;
  tokenProvider: TokenProvider;
  telemetryReporter?: TelemetryReporter | undefined;
  treeProvider?: TreeProvider | undefined;
  ui: UserInteraction;
  cryptoProvider?: CryptoProvider | undefined;
  permissionRequest?: PermissionRequestProvider | undefined;
  constructor(connection: MessageConnection) {
    this.connection = connection;
    this.logProvider = new RemoteLogProvider(connection);
    this.tokenProvider = new RemoteTokenProvider(connection);
    this.telemetryReporter = new RemoteTelemetryReporter(connection);
    this.ui = new RemoteUserInteraction(connection);
  }
}
